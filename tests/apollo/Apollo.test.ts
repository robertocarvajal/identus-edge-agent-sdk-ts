import { describe, it, expect, test, beforeEach, afterEach } from 'vitest';

import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import Apollo from "../../src/apollo/Apollo";
import { Secp256k1KeyPair } from "../../src/apollo/utils/Secp256k1KeyPair";
import * as ECConfig from "../../src/domain/models/ECConfig";

import { bip39Vectors } from "./derivation/BipVectors";
import { DerivationPath } from "../../src/apollo/utils/derivation/DerivationPath";
import { Secp256k1PrivateKey } from "../../src/apollo/utils/Secp256k1PrivateKey";
import { Ed25519PrivateKey } from "../../src/apollo/utils/Ed25519PrivateKey";
import { X25519PrivateKey } from "../../src/apollo/utils/X25519PrivateKey";
import { Ed25519PublicKey } from "../../src/apollo/utils/Ed25519PublicKey";
import { X25519PublicKey } from "../../src/apollo/utils/X25519PublicKey";
import { Secp256k1PublicKey } from "../../src/apollo/utils/Secp256k1PublicKey";
import {
  ApolloError,
  Curve,
  KeyTypes,
  PrivateKey,
  StorableKey,
  MnemonicWordList,
  curveToAlg,
  JWT_ALG
} from "../../src/domain/models";
import * as Fixtures from "../fixtures";
import { PrismDerivationPath } from "../../src/domain/models/derivation/schemas/PrismDerivation";
import { DeprecatedDerivationPath } from "../../src/domain/models/derivation/schemas/DeprecatedDerivation";
import { DerivationAxis } from "../../src/domain/models/derivation/DerivationAxis";
import ApolloPKG from "@hyperledger/identus-apollo";
import { normaliseDER } from "../../src/domain/utils/DER";
import { hash, hashSync } from '../../src/domain/utils/hash';
import { randomBytes } from "../../src/domain/utils/randomBytes";

const ApolloSDK = ApolloPKG.org.hyperledger.identus.apollo;
chai.use(chaiAsPromised);

describe("Apollo", () => {
  let apollo: Apollo;

  beforeEach(() => {
    apollo = new Apollo();
  });

  it("It should test random mnemonic generation length always matches 24", () => {
    for (let i = 1; i <= 10; i++) {
      expect(apollo.createRandomMnemonics().length).to.equal(24);
    }
  });

  it("Should generate random mnemonics", () => {
    const seenWords: string[] = new Array(24);
    for (let i = 1; i <= 300; i++) {
      seenWords.push(
        ...apollo
          .createRandomMnemonics()
          .filter((newWord) => !seenWords.includes(newWord))
      );
    }
    // with great probability we'll see at least 75% of words after 3600 draws from 2048 possible
    expect(2048 - seenWords.length).to.be.lessThan(512);
  });

  describe("createSeed", () => {
    const list = [
      "tool",
      "knock",
      "nerve",
      "skate",
      "detail",
      "early",
      "limit",
      "energy",
      "foam",
      "garage",
      "resource",
      "boring",
      "traffic",
      "violin",
      "cave",
      "place",
      "accuse",
      "can",
      "bring",
      "bring",
      "cargo",
      "clip",
      "stick",
      "dog",
    ];

    test("Passes with length 24 word list", () => {
      const result = apollo.createSeed(list as any, "");
      expect(result).not.to.be.undefined;
    });

    test("Passes with length 12 word list", () => {
      const mnemonics =
        "legal winner thank year wave sausage worth useful legal winner thank yellow".split(
          " "
        );
      const result = apollo.createSeed(mnemonics as any, "");
      expect(result).not.to.be.undefined;
    });

    for (let i = 0; i < 24; i++) {
      if (i === 12) continue;

      it(`Should fail when mnemonics is wrong length [${i}]`, () => {
        const mnemonics = list.slice(0, i);

        assert.throws(
          () => apollo.createSeed(mnemonics as any, ""),
          ApolloError.MnemonicLengthError
        );
      });
    }

    it("Should test failure when checksum is incorrect", () => {
      const mnemonicCode = Array(24).fill("abandon") as MnemonicWordList;
      assert.throws(
        () => {
          apollo.createSeed(mnemonicCode, "");
        },
        ApolloError.MnemonicWordError
      );
    });

    it("Should compute the right binary seed", () => {
      const password = "TREZOR";
      const vectors = JSON.parse(bip39Vectors) as string[][];

      for (const v of vectors) {
        const [, mnemonicPhrase, binarySeedHex] = v;
        const mnemonicCode = mnemonicPhrase.split(" ") as MnemonicWordList;
        const binarySeed = apollo.createSeed(mnemonicCode, password);

        expect(binarySeedHex).to.equal(
          Buffer.from(binarySeed.value).toString("hex")
        );
      }
    });

    it("Should test failure when invalid word is used", () => {
      const mnemonicCode = [
        "hocus",
        "pocus",
        "mnemo",
        "codus",
        ...Array(20).fill("abandon"),
      ] as MnemonicWordList;
      assert.throws(() => {
        apollo.createSeed(mnemonicCode, "");
      }, ApolloError.MnemonicWordError);
    });
  });

  it("Should test secp256k1KeyPair generation", () => {
    const keyPair = Secp256k1KeyPair.generateKeyPair();
    expect(keyPair.privateKey.getEncoded().length).to.equal(
      ECConfig.PRIVATE_KEY_BYTE_SIZE
    );
    expect(
      Buffer.from(keyPair.privateKey.getEncoded()).toString("hex").length
    ).to.equal(ECConfig.PRIVATE_KEY_BYTE_SIZE * 2);

    expect(keyPair.publicKey.getEncoded().length).to.equal(
      ECConfig.PUBLIC_KEY_BYTE_SIZE
    );
    expect(
      Buffer.from(keyPair.publicKey.getEncoded()).toString("hex").length
    ).to.equal(ECConfig.PUBLIC_KEY_BYTE_SIZE * 2);
  });

  it("Should create a private key from encoded", () => {
    const keyPair = Secp256k1KeyPair.generateKeyPair();
    const encodedPrivateKey = keyPair.privateKey.getEncoded();
    const newFromBytes = new Secp256k1PrivateKey(encodedPrivateKey);
    expect(keyPair.privateKey.raw).to.deep.equal(newFromBytes.raw);
  });

  it("Should create and Sign and verify a message using Secp256k1 KeyPair", async () => {
    const text = Buffer.from("test text");
    const apollo = new Apollo();
    const seed = apollo.createRandomSeed().seed;

    const privateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: Buffer.from(seed.value).toString("hex"),
    });

    const signature =
      privateKey.isSignable() && privateKey.sign(Buffer.from(text));

    expect(signature).to.not.be.equal(false);

    if (signature) {
      const publicKey = privateKey.publicKey();
      const verified =
        publicKey.canVerify() && publicKey.verify(text, Buffer.from(signature));
      expect(verified).to.be.equal(true);
    }
  });

  it("Should test our hashing libraries", async () => {
    const text = "test";
    const validHashing = ["SHA256", "SHA512"];
    validHashing.forEach((alg) => {
      expect(() => hashSync(text, alg)).to.not.be.undefined;
      expect(hash(text, alg)).to.eventually.not.be.undefined;
    });
  });

  it("Should generate random bytes", async () => {
    const initValue = new Uint8Array(64);
    const initHex = Buffer.from(initValue).toString('hex');
    const random = randomBytes(initValue);
    expect(initHex).to.not.deep.eq(Buffer.from(random).toString('hex'));
  });

  it("Should should normalise SECP256K1 der signature from apollo", async () => {
    const text = Buffer.from("test text");
    const seed = apollo.createRandomSeed();
    const sk = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: Buffer.from(seed.seed.value).toString('hex'),
    });
    const pk = sk.publicKey();
    const nativeSk = ApolloSDK.utils.KMMECSecp256k1PrivateKey.Companion.secp256k1FromByteArray(
      Int8Array.from(sk.raw)
    );
    const signed = Buffer.from(
      nativeSk.sign(
        Int8Array.from(text)
      )
    );
    const normalisedRaw = normaliseDER(signed);
    const signature = pk.canVerify() && pk.verify(text, signed);
    expect(signature).to.eq(true);
    const normalisedSignature = pk.canVerify() && pk.verify(text, normalisedRaw);
    expect(normalisedSignature).to.eq(true);
  });

  it("Should only verify signed message using the correct SECP256K1 KeyPair", async () => {
    const text = Buffer.from("test text");
    const apollo = new Apollo();
    const seed = apollo.createRandomSeed().seed;

    const privateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: Buffer.from(seed.value).toString("hex"),
    });

    const wrongPrivateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: Buffer.from(apollo.createRandomSeed().seed.value).toString("hex"),
    });

    const signature = privateKey.isSignable() && privateKey.sign(text);

    expect(signature).to.not.be.equal(false);

    if (signature) {
      const publicKey = wrongPrivateKey.publicKey();
      const verified =
        publicKey.canVerify() && publicKey.verify(text, signature);

      expect(verified).to.be.equal(false);
    }
  });

  it("Should create and Sign and verify a message using ED25519 KeyPair", async () => {
    const text = Buffer.from("test text");
    const apollo = new Apollo();

    const privateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.ED25519,
    });

    const signature = privateKey.isSignable() && privateKey.sign(text);
    if (signature) {
      const publicKey = privateKey.publicKey();
      const verified =
        publicKey.canVerify() && publicKey.verify(text, signature);

      expect(verified).to.be.equal(true);
    }
  });

  it("Should only verify signed message using the correct ED25519 KeyPair", async () => {
    const text = Buffer.from("test text");
    const apollo = new Apollo();

    const privateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.ED25519,
    });

    const wrongPrivateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.ED25519,
    });

    const signature = privateKey.isSignable() && privateKey.sign(text);

    expect(signature).to.not.be.equal(false);

    if (signature) {
      const publicKey = wrongPrivateKey.publicKey();
      const verified =
        publicKey.canVerify() && publicKey.verify(text, signature);

      expect(verified).to.be.equal(false);
    }
  });

  it("Should only be derivable if secp256k1 keys is used, others are not derivable.", async () => {
    const apollo = new Apollo();

    expect(
      apollo
        .createPrivateKey({
          type: KeyTypes.EC,
          curve: Curve.ED25519,
        })
        .isDerivable()
    ).to.be.equal(true);

    expect(
      apollo
        .createPrivateKey({
          type: KeyTypes.Curve25519,
          curve: Curve.X25519,
        })
        .isDerivable()
    ).to.be.equal(false);

    const seed = apollo.createRandomSeed().seed;
    const privateKey = apollo.createPrivateKey({
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: Buffer.from(seed.value).toString("hex"),
    });

    expect(privateKey.isDerivable()).to.be.equal(true);
  });

  it("Should derive secp256k1 privateKey the same way as if we create a new key in Apollo.", async () => {
    const path = DerivationPath.fromPath(`m/0'/0'/1'`, [DeprecatedDerivationPath, PrismDerivationPath]);
    const createKeyArgs = {
      type: KeyTypes.EC,
      curve: Curve.SECP256K1,
      seed: "a4dd58542e9959eccb56832a953c0e54b3321036b6165ec2f3c1ef533cd1d6da5fae8010c587535404534c192397483c765505f67e62b26026392f8a0cf8ba51",
    };

    const privateKey = apollo.createPrivateKey(createKeyArgs);
    const derived = privateKey.isDerivable() && privateKey.derive(path.toString());
    expect(derived).to.not.equal(false);

    const withDerivationPath = apollo.createPrivateKey({
      ...createKeyArgs,
      derivationPath: path.toString(),
    });

    const raw1 = (derived as PrivateKey).getEncoded().toString();
    const raw2 = withDerivationPath.getEncoded().toString();
    const raw3 = privateKey.getEncoded().toString();

    expect(raw1).to.equal(raw2);
    expect(raw1).to.not.equal(raw3);
  });

  describe("DerivationPath", () => {
    it("Should throw an error when invalid path is used", async () => {
      expect(() => DerivationAxis.normal("m/x" as any)).to.throws("Invalid axis, not a number");
    });
    it("Should throw an error when invalid path is used", async () => {
      expect(() => DerivationAxis.hardened("m/x" as any)).to.throws("Invalid axis, not a number");
    });
    it("Should throw an error when invalid path is used", async () => {
      expect(() => DerivationAxis.normal(-1)).to.throws("Number corresponding to the axis should be a positive number");
    });
    it("Should throw an error when invalid path is used", async () => {
      expect(() => DerivationAxis.hardened(-1)).to.throws("Number corresponding to the axis should be a positive number");
    });
    it("Should throw an error when invalid path is used", async () => {
      expect(() => DerivationPath.fromPath("m/x", [DeprecatedDerivationPath, PrismDerivationPath])).to.throws("182: Invalid axis, not a number");
    });

    it("Should throw an error when invalid (non string) path is used", async () => {
      expect(() => DerivationPath.fromPath(null as any, [DeprecatedDerivationPath, PrismDerivationPath])).to.throws("182: Derivation path should be string");
    });
    it("Should throw an error when empty derivation schema is used", async () => {
      const path = DerivationPath.empty([DeprecatedDerivationPath, PrismDerivationPath]);
      expect(() => path.toString()).to.throws("DerivationPathErr Derivation path is empty");
    });
    it("Should throw an error when wrong path not starting with m or M", async () => {
      expect(() => DerivationPath.fromPath("d/0", [DeprecatedDerivationPath, PrismDerivationPath]).toString()).to.throws("182: Path needs to start with m or M");
    });
    it("Should throw an error when invalid derivation schema is used", async () => {
      const path = DerivationPath.empty([DeprecatedDerivationPath, PrismDerivationPath]);
      const derived = path
        .derive(DerivationAxis.hardened(1))
        .derive(DerivationAxis.normal(1))
        .derive(DerivationAxis.hardened(1))
        .derive(DerivationAxis.hardened(1));

      expect(() => derived.toString()).to.throws("DerivationPathErr Incompatible Derivation schema");
    });

    it("Should throw an error when invalid derivation schema is used", async () => {
      expect(() => DerivationPath.fromPath("m/0", [DeprecatedDerivationPath, PrismDerivationPath]).toString()).to.throws("DerivationPathErr Incompatible Derivation schema");
    });
  });

  describe("Curve to alg", () => {
    it("Should convert from curve to alg correctly", () => {

      expect(curveToAlg('and')).to.eq(JWT_ALG.unknown);
      expect(curveToAlg(Curve.SECP256K1)).to.eq(JWT_ALG.ES256K);

      expect(curveToAlg(Curve.ED25519)).to.eq(JWT_ALG.EdDSA);

      expect(curveToAlg(Curve.X25519)).to.eq(JWT_ALG.EdDSA);

    });
  });

  describe("KeyRestoration", () => {

    describe("restorePrivateKey", () => {
      test("recoveryId ed25519+priv - matches - returns Ed25519PrivateKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("ed25519", "priv"),
          raw: Fixtures.Keys.ed25519.privateKey.raw
        };

        const result = apollo.restorePrivateKey(key);

        expect(result).to.be.an.instanceOf(Ed25519PrivateKey);
      });

      test("recoveryId x25519+priv - matches - returns X25519PrivateKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("x25519", "priv"),
          raw: Fixtures.Keys.x25519.privateKey.raw
        };

        const result = apollo.restorePrivateKey(key);

        expect(result).to.be.an.instanceOf(X25519PrivateKey);
      });

      test("recoveryId secp256k1+priv - matches - returns Secp256k1PrivateKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("secp256k1", "priv"),
          raw: Fixtures.Keys.secp256K1.privateKey.raw
        };

        const result = apollo.restorePrivateKey(key);

        expect(result).to.be.an.instanceOf(Secp256k1PrivateKey);
      });

      test("recoveryId - unmatched - throws", () => {
        const key = {
          recoveryId: "notValid",
          raw: Fixtures.Keys.ed25519.privateKey.raw
        };

        assert.throws(() => apollo.restorePrivateKey(key as any), ApolloError.KeyRestoratonFailed);
      });
    });

    describe("restorePublicKey", () => {
      test("recoveryId ed25519+pub - matches - returns Ed25519PrivateKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("ed25519", "pub"),
          raw: Fixtures.Keys.ed25519.publicKey.raw
        };

        const result = apollo.restorePublicKey(key);

        expect(result).to.be.an.instanceOf(Ed25519PublicKey);
      });

      test("recoveryId x25519+pub - matches - returns X25519PublicKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("x25519", "pub"),
          raw: Fixtures.Keys.x25519.publicKey.raw
        };

        const result = apollo.restorePublicKey(key);

        expect(result).to.be.an.instanceOf(X25519PublicKey);
      });

      test("recoveryId secp256k1+pub - matches - returns Secp256k1PublicKey instance", () => {
        const key: StorableKey = {
          recoveryId: StorableKey.recoveryId("secp256k1", "pub"),
          raw: Fixtures.Keys.secp256K1.publicKey.raw
        };

        const result = apollo.restorePublicKey(key);

        expect(result).to.be.an.instanceOf(Secp256k1PublicKey);
      });

      test("recoveryId - unmatched - throws", () => {
        const key = {
          recoveryId: "notValid",
          raw: Fixtures.Keys.ed25519.publicKey.raw
        };

        assert.throws(() => apollo.restorePublicKey(key as any), ApolloError.KeyRestoratonFailed);
      });
    });
  });
});
