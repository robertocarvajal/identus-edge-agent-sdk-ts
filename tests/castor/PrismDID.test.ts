import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { base58btc } from "multiformats/bases/base58";
import { describe, assert, it, expect, test, beforeEach, afterEach } from 'vitest';
import { Authentication, Curve, DIDDocument, getProtosUsage, getUsageId, JWT_ALG, KeyTypes, PublicKey, Services, Usage, VerificationMethod, VerificationMethods } from "../../src/domain";
import Apollo from "../../src/apollo/Apollo";
import Castor from "../../src/castor/Castor";
import * as ECConfig from "../../src/domain/models/ECConfig";
import { Secp256k1PublicKey } from "../../src/apollo/utils/Secp256k1PublicKey";
import * as Fixtures from "../fixtures";
import * as Protos from "../../src/castor/protos/node_models";
import { PrismDIDPublicKey } from "../../src/castor/did/prismDID/PrismDIDPublicKey";
import { ed25519, x25519 } from "../fixtures/keys";

chai.use(chaiAsPromised);

const apollo = new Apollo();
const castor = new Castor(apollo);

describe("PrismDID", () => {
  const secpDid = "did:prism:74f299ab7e5b2d127802b6a7093f5b9dd642e95aadf858cade6ec9af6929a487:CscBCsQBElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJkCg9hdXRoZW50aWNhdGlvbjAQBEJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-iw";
  const secpMultibase = "zSXxpYB6edvxvWxRTo3kMUoTTQVHpbNnXo2Z1AjLA78iqLdK2kVo5xw9rGg8uoEgmhxYahNur3RvV7HnaktWBqkXt";
  const ed25519Did = "did:prism:30dc8276c5facc040dab037dd8c5c6d0e3218720a1e1c241c0341fcfea83cc60:Co0CCooCElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJkCg9hdXRoZW50aWNhdGlvbjAQBEJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJECghpc3N1aW5nMBACSjYKB0VkMjU1MTkSK2RtNWYyR2RSNUJhSHBSeEI4YlRFbHZFXzBnSUMycDQwNE1zeDlzd0o5MTQ";
  const ed25519Multibase = "z8yJizaEga14wo4pHUDBXCnrp5A9WbFDuk5DZnPq5mCHK";
  const x25519Did = "did:prism:a5cce445f3e013fc2fa76914742b8b493b436251a29727ea57a4708b80fa3a68:CowCCokCElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJkCg9hdXRoZW50aWNhdGlvbjAQBEJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJDCghpc3N1aW5nMBACSjUKBlgyNTUxORIrX1BqSGVmRmg5SDdxSDNWdDdNTzhWRU4tRjJQbFdjWHpkeHc2TFBreEVHRQ";
  const x25519Multibase = "zJ2VmASEaRF41F4BQSydGNi7zd5ud5YhqXxTKicPGd5FN";

  describe("PrismDidPublicKey", () => {
    it("Should create getProtosUsageCorrectly", () => {
      expect(getProtosUsage("any" as any)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.UNKNOWN_KEY);
      expect(getProtosUsage(Usage.MASTER_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.MASTER_KEY);
      expect(getProtosUsage(Usage.ISSUING_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.ISSUING_KEY);
      expect(getProtosUsage(Usage.KEY_AGREEMENT_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.KEY_AGREEMENT_KEY);
      expect(getProtosUsage(Usage.AUTHENTICATION_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.AUTHENTICATION_KEY);
      expect(getProtosUsage(Usage.REVOCATION_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.REVOCATION_KEY);
      expect(getProtosUsage(Usage.CAPABILITY_INVOCATION_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.CAPABILITY_INVOCATION_KEY);
      expect(getProtosUsage(Usage.CAPABILITY_DELEGATION_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.CAPABILITY_DELEGATION_KEY);
      expect(getProtosUsage(Usage.UNKNOWN_KEY)).to.eq(Protos.io.iohk.atala.prism.protos.KeyUsage.UNKNOWN_KEY);
    });

    it("Should create from and to valid key protos", () => {
      const unsupportedRaw = new Array(32).fill(1);
      const unsupportedCurve = "secp256r1";
      const otherTypePK: PublicKey = {
        value: unsupportedRaw,
        type: KeyTypes.unknown,
        keySpecification: new Map(),
        size: 0,
        raw: unsupportedRaw,
        curve: unsupportedCurve,
        alg: JWT_ALG.unknown,
        getEncoded() {
          return unsupportedRaw;
        }
      } as any;
      const keys = [
        Fixtures.Keys.secp256K1.publicKey,
        Fixtures.Keys.ed25519.publicKey,
        Fixtures.Keys.x25519.publicKey,
      ];
      keys.forEach((key) => {
        const masterPk = new PrismDIDPublicKey(
          getUsageId(Usage.MASTER_KEY),
          Usage.MASTER_KEY,
          key
        );
        const masterPkProto = masterPk.toProto();
        const recoveredPk = PrismDIDPublicKey.fromProto(apollo, masterPkProto);
        expect(masterPk.keyData.raw).to.deep.eq(recoveredPk.keyData.raw);
        expect(masterPk.usage).to.eq(recoveredPk.usage);
        expect(masterPk.id).to.eq(recoveredPk.id);
      });

      const masterPk = new PrismDIDPublicKey(
        getUsageId(Usage.MASTER_KEY),
        Usage.MASTER_KEY,
        otherTypePK
      );
      const masterPkProto = masterPk.toProto();

      expect(() => PrismDIDPublicKey.fromProto(apollo, masterPkProto)).to.throw(`16: Invalid key curve: ${unsupportedCurve}. Valid options are: X25519, Ed25519, Secp256k1`);
    });
  });

  describe("createPrismDID", () => {
    it("Should create a prismDID from a PublicKey (SECP256K1)", async () => {
      const result = await castor.createPrismDID(Fixtures.Keys.secp256K1.publicKey, []);
      expect(result).not.to.be.null;
      expect(result.toString()).to.equal(secpDid);
    });

    it("Should create a prismDID from a KeyPair (SECP256K1)", async () => {
      const result = await castor.createPrismDID(Fixtures.Keys.secp256K1, []);
      expect(result).not.to.be.null;
      expect(result.toString()).to.equal(secpDid);
    });

    it("Should create a prismDID from a KeyPair (Ed25519)", async () => {
      const result = await castor.createPrismDID(Fixtures.Keys.secp256K1, [], [Fixtures.Keys.ed25519]);
      expect(result).not.to.be.null;
      expect(result.toString()).to.equal(ed25519Did);
    });

    it("Should create a prismDID from a KeyPair (X25519)", async () => {
      const result = await castor.createPrismDID(Fixtures.Keys.secp256K1, [], [Fixtures.Keys.x25519]);
      expect(result.toString()).to.equal(x25519Did);
    });
  });

  describe("Integration Tests", () => {
    describe("DIDDocument", () => {
      test("real example resolves correctly", async () => {
        const didStr = "did:prism:73196107e806b084d44339c847a3ae8dd279562f23895583f62cc91a2ee5b8fe:CnsKeRI8CghtYXN0ZXItMBABSi4KCXNlY3AyNTZrMRIhArrplJNfQYxthryRU87XdODy-YWUh5mqrvIfAdoZFeJBEjkKBWtleS0wEAJKLgoJc2VjcDI1NmsxEiEC8rsFplfYvRLazdWWi3LNR1gaAQXb-adVhZacJT4ntwE";
        const sut = await castor.resolveDID(didStr);

        expect(sut).to.be.instanceOf(DIDDocument);
        expect(sut.id.toString()).to.eq(didStr);
        expect(sut.coreProperties).to.be.an("array").to.have.length(4);

        const cp0 = sut.coreProperties.at(0) as Authentication;
        expect(cp0).to.be.instanceOf(Authentication);
        expect(cp0.urls).to.include(`${didStr}#master-0`);
        const cp0vm0 = cp0.verificationMethods.at(0);
        expect(cp0vm0).to.be.instanceOf(VerificationMethod);
        expect(cp0vm0?.controller).to.eq(didStr);
        expect(cp0vm0?.id).to.eq(`${didStr}#master-0`);
        expect(cp0vm0?.publicKeyJwk).to.be.undefined;
        expect(cp0vm0?.publicKeyMultibase).to.eq("zRDBW15pMDuec8faAkL7oEjQhtk8S7FmFm1oE5DgPHpBLM3E5huETfpyS388WqXGsvddpmNkhA3bh3vcsASCZMTaM");
        expect(cp0vm0?.type).to.eq("Secp256k1");

        const cp1 = sut.coreProperties.at(1) as Authentication;
        expect(cp1).to.be.instanceOf(Authentication);
        expect(cp1.urls).to.include(`${didStr}#key-0`);
        const cp1vm0 = cp1.verificationMethods.at(0);
        expect(cp1vm0).to.be.instanceOf(VerificationMethod);
        expect(cp1vm0?.controller).to.eq(didStr);
        expect(cp1vm0?.id).to.eq(`${didStr}#key-0`);
        expect(cp1vm0?.publicKeyJwk).to.be.undefined;
        expect(cp1vm0?.publicKeyMultibase).to.eq("zSKufitbSMxJ2R7o5ivGubwYHfRU1jQ6soSKzH4p7yDQP5vXmwjjnaSjXCDmtriay93hm7B4erFqxNzrSiwT9PFqZ");
        expect(cp1vm0?.type).to.eq("Secp256k1");

        const cp2 = sut.coreProperties.at(2) as Services;
        expect(cp2).to.be.instanceOf(Services);
        expect(cp2.values).to.be.empty;

        // TODO why do we have duplicates of coreProperties 0 & 1 here?
        const cp3 = sut.coreProperties.at(3) as VerificationMethods;
        expect(cp3).to.be.instanceOf(VerificationMethods);
        expect(cp3.values).to.have.length(2);

        const cp3v0 = cp3.values.at(0);
        expect(cp3v0).to.be.instanceOf(VerificationMethod);
        expect(cp3v0?.controller).to.eq(didStr);
        expect(cp3v0?.id).to.eq(`${didStr}#master-0`);
        expect(cp3v0?.publicKeyJwk).to.be.undefined;
        expect(cp3v0?.publicKeyMultibase).to.eq("zRDBW15pMDuec8faAkL7oEjQhtk8S7FmFm1oE5DgPHpBLM3E5huETfpyS388WqXGsvddpmNkhA3bh3vcsASCZMTaM");
        expect(cp3v0?.type).to.eq("Secp256k1");

        const cp3v1 = cp3.values.at(1);
        expect(cp3v1).to.be.instanceOf(VerificationMethod);
        expect(cp3v1?.controller).to.eq(didStr);
        expect(cp3v1?.id).to.eq(`${didStr}#key-0`);
        expect(cp3v1?.publicKeyJwk).to.be.undefined;
        expect(cp3v1?.publicKeyMultibase).to.eq("zSKufitbSMxJ2R7o5ivGubwYHfRU1jQ6soSKzH4p7yDQP5vXmwjjnaSjXCDmtriay93hm7B4erFqxNzrSiwT9PFqZ");
        expect(cp3v1?.type).to.eq("Secp256k1");
      });

      const masterKeyId = getUsageId(Usage.MASTER_KEY);
      const authKeyId = getUsageId(Usage.AUTHENTICATION_KEY);

      const testVerificationMethod = (sut: any, didStr: string, keyId: string, keyMultibase: string, curve: Curve) => {
        expect(sut).to.be.instanceOf(VerificationMethod);
        expect(sut?.controller).to.eq(didStr);
        expect(sut?.id).to.eq(`${didStr}#${keyId}`);
        expect(sut?.publicKeyJwk).to.be.undefined;
        expect(sut?.publicKeyMultibase).to.eq(keyMultibase);
        expect(sut?.type).to.eq(curve);
      };

      test("master key", async () => {
        const prismDid = await castor.createPrismDID(Fixtures.Keys.secp256K1, [], []);
        const sut = await castor.resolveDID(prismDid.toString());

        expect(sut).not.to.be.null;
        expect(sut.coreProperties).to.be.an("array").to.have.length(4);

        // master key correctly encoded > decoded
        const masterProp = sut.coreProperties.at(0) as Authentication;
        expect(masterProp).to.be.instanceOf(Authentication);
        expect(masterProp.urls[0]).to.eq(`${secpDid}#${masterKeyId}`);
        const mastervm0 = masterProp.verificationMethods.at(0);
        testVerificationMethod(mastervm0, secpDid, masterKeyId, secpMultibase, Curve.SECP256K1);

        // authentication key correctly encoded > decoded
        const authProp = sut.coreProperties.at(1) as Authentication;
        expect(authProp).to.be.instanceOf(Authentication);
        expect(authProp.urls[0]).to.eq(`${secpDid}#${authKeyId}`);
        const authvm0 = authProp.verificationMethods.at(0);
        testVerificationMethod(authvm0, secpDid, authKeyId, secpMultibase, Curve.SECP256K1);

        // no services given - so empty
        const services = sut.coreProperties.at(2) as Services;
        expect(services).to.be.instanceOf(Services);
        expect(services.values).to.be.empty;

        // no issuing keys given - so only master and authentication keys duplicated
        const verificationMethods = sut.coreProperties.at(3) as VerificationMethods;
        expect(verificationMethods).to.be.instanceOf(VerificationMethods);
        expect(verificationMethods.values).to.have.length(2);

        const vm0 = verificationMethods.values.at(0);
        testVerificationMethod(vm0, secpDid, masterKeyId, secpMultibase, Curve.SECP256K1);

        const vm1 = verificationMethods.values.at(1);
        testVerificationMethod(vm1, secpDid, authKeyId, secpMultibase, Curve.SECP256K1);
      });

      test("issuing keys", async () => {
        const expectedDid = "did:prism:44a6f5f04609666ce54770e5d9ab67801b41d8e66e4e1cfdf9a2e75ef5bda3e2:CtICCs8CElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJkCg9hdXRoZW50aWNhdGlvbjAQBEJPCglzZWNwMjU2azESIP0gMhTAVOk7SgWRluzmeJIjtm2-YMc6AbrD3ePKJQj-GiDZlsa5pQuXGzKvgK10D8SzuDvh79u5oMB7-ZeJNAh-ixJECghpc3N1aW5nMBACSjYKB0VkMjU1MTkSK2RtNWYyR2RSNUJhSHBSeEI4YlRFbHZFXzBnSUMycDQwNE1zeDlzd0o5MTQSQwoIaXNzdWluZzEQAko1CgZYMjU1MTkSK19QakhlZkZoOUg3cUgzVnQ3TU84VkVOLUYyUGxXY1h6ZHh3NkxQa3hFR0U";
        const prismDid = await castor.createPrismDID(Fixtures.Keys.secp256K1, [], [ed25519, x25519]);
        const sut = await castor.resolveDID(prismDid.toString());

        expect(sut.coreProperties).to.be.an("array").to.have.length(6);

        // index 2 & 3 should be issuing keys

        // no services given - so empty
        const services = sut.coreProperties.at(4) as Services;
        expect(services).to.be.instanceOf(Services);
        expect(services.values).to.be.empty;

        // 2 issuing keys given - 4 total
        const verificationMethods = sut.coreProperties.at(5) as VerificationMethods;
        expect(verificationMethods).to.be.instanceOf(VerificationMethods);
        expect(verificationMethods.values).to.have.length(4);

        const vm0 = verificationMethods.values.at(0);
        testVerificationMethod(vm0, expectedDid, masterKeyId, secpMultibase, Curve.SECP256K1);

        const vm1 = verificationMethods.values.at(1);
        testVerificationMethod(vm1, expectedDid, authKeyId, secpMultibase, Curve.SECP256K1);

        const vm2 = verificationMethods.values.at(2);
        testVerificationMethod(vm2, expectedDid, getUsageId(Usage.ISSUING_KEY, 0), ed25519Multibase, Curve.ED25519);

        const vm3 = verificationMethods.values.at(3);
        testVerificationMethod(vm3, expectedDid, getUsageId(Usage.ISSUING_KEY, 1), x25519Multibase, Curve.X25519);
      });
    });

    it("Should correctly create a prismDID from an existing HexKey", async () => {
      const didExample = "did:prism:03425669b4d84b21a323c60bb41601eb22906b1a6427be3126277420faa6d1f3:CscBCsQBElwKB21hc3RlcjAQAUJPCglzZWNwMjU2azESIDS5zeYUkLCSAJLI6aLXRTPRxstCLPUEI6TgBrAVCHkwGiDk-ffklrHIFW7pKkT8i-YksXi-XXi5h31czUMaVClcpxJkCg9hdXRoZW50aWNhdGlvbjAQBEJPCglzZWNwMjU2azESIDS5zeYUkLCSAJLI6aLXRTPRxstCLPUEI6TgBrAVCHkwGiDk-ffklrHIFW7pKkT8i-YksXi-XXi5h31czUMaVClcpw";
      const resolvedDID = await castor.resolveDID(didExample);

      const pubHex = "0434b9cde61490b0920092c8e9a2d74533d1c6cb422cf50423a4e006b015087930e4f9f7e496b1c8156ee92a44fc8be624b178be5d78b9877d5ccd431a54295ca7";
      const masterPublicKey = new Secp256k1PublicKey(Buffer.from(pubHex, "hex"));

      const createdDID = await castor.createPrismDID(masterPublicKey, []);
      const resolveCreated = await castor.resolveDID(createdDID.toString());

      const verificationMethod = resolveCreated.coreProperties.find(
        (prop): prop is VerificationMethods => prop instanceof VerificationMethods
      );

      const resolvedPublicKeyMultibase =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
        verificationMethod?.values.at(0)?.publicKeyMultibase!;

      const resolvedPublicKeyBuffer = Buffer.from(
        base58btc.decode(resolvedPublicKeyMultibase)
      );

      expect(resolvedPublicKeyBuffer).to.deep.equal(masterPublicKey.raw);
      expect(resolveCreated.id.toString()).to.be.equal(resolvedDID.id.toString());
    });

    it("Create a PrismDID and verify a signature", async () => {
      const privateKey = apollo.createPrivateKey({
        type: KeyTypes.EC,
        curve: Curve.SECP256K1,
        seed: Buffer.from(apollo.createRandomSeed().seed.value).toString("hex"),
      });
      const publicKey = privateKey.publicKey();

      const did = await castor.createPrismDID(publicKey, []);
      const text = "The quick brown fox jumps over the lazy dog";
      const signature =
        privateKey.isSignable() && privateKey.sign(Buffer.from(text));

      expect(signature).to.not.be.equal(false);

      if (signature) {
        const result = await castor.verifySignature(
          did,
          Buffer.from(text),
          Buffer.from(signature)
        );
        expect(result).to.be.equal(true);
      }
    });

    it("Create a ED25519 PrismDID and verify a signature", async () => {

      const issuerSeed = apollo.createRandomSeed().seed;

      const sk = apollo.createPrivateKey({
        type: KeyTypes.EC,
        curve: Curve.ED25519,
        seed: Buffer.from(issuerSeed.value).toString("hex"),
      });
      const masterSk = apollo.createPrivateKey({
        type: KeyTypes.EC,
        curve: Curve.SECP256K1,
        seed: Buffer.from(issuerSeed.value).toString("hex"),
      });

      const did = await castor.createPrismDID(masterSk.publicKey(), [], [sk.publicKey()]);
      const text = "The quick brown fox jumps over the lazy dog";
      const signature =
        sk.isSignable() && sk.sign(Buffer.from(text));

      expect(signature).to.not.be.equal(false);

      if (signature) {
        const result = await castor.verifySignature(
          did,
          Buffer.from(text),
          Buffer.from(signature)
        );
        expect(result).to.be.equal(true);
      }
    });

    it("Should resolve prismDID key correctly", async () => {

      const did =
        "did:prism:2c6e089b137b566e97bf8e1c234755f9f8690194c3bc52c6431ff4bb960394b1:CtADCs0DElsKBmF1dGgtMRAEQk8KCXNlY3AyNTZrMRIgvMs2bdoiICUhwR4BGk2hip8QWzG0YUfKaOa1xDyxMNUaIHm3gJ0eaeiqadY0NFlXOcAidM1SUyupvouHKsaCr0IaEmAKC2Fzc2VydGlvbi0xEAJCTwoJc2VjcDI1NmsxEiCr03dJu2xHHYCOBKNK4JNwh3ypp2JX6-Cr8tXiI17KnBogK9A6g0btjurK8n1R2ZeACOFmZkzPs2wDUy01UtqLH4sSXAoHbWFzdGVyMBABQk8KCXNlY3AyNTZrMRIgA1ltJZ4-5OmDYoiP2ZiKg-MMDR3BfDdw-oHYCvpGZEQaIAh1R73E0DW_wi4Ng5xxkDQ77ocpSz_iiEGE9svSPxtaGjoKE2h0dHBzOi8vZm9vLmJhci5jb20SDUxpbmtlZERvbWFpbnMaFGh0dHBzOi8vZm9vLmJhci5jb20vGjgKEmh0dHBzOi8vdXBkYXRlLmNvbRINTGlua2VkRG9tYWlucxoTaHR0cHM6Ly91cGRhdGUuY29tLxo4ChJodHRwczovL3JlbW92ZS5jb20SDUxpbmtlZERvbWFpbnMaE2h0dHBzOi8vcmVtb3ZlLmNvbS8";
      const resolved = await castor.resolveDID(did);

      const verificationMethod = resolved.coreProperties.find(
        (prop): prop is VerificationMethods => prop instanceof VerificationMethods
      );

      const resolvedPublicKeyBase64 =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
        verificationMethod?.values.at(0)?.publicKeyMultibase!;

      const resolvedPublicKeyBuffer = Buffer.from(
        base58btc.decode(resolvedPublicKeyBase64)
      );

      resolvedPublicKeyBuffer.length;
      expect(resolvedPublicKeyBuffer.length).to.be.equal(
        ECConfig.PUBLIC_KEY_BYTE_SIZE
      );
    });
  });
});
