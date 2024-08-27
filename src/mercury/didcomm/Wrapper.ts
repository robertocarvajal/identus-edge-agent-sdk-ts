import type {
  DIDResolver,
  Base64AttachmentData,
  SecretsResolver,
  JsonAttachmentData,
  LinksAttachmentData,
  Attachment,
  AttachmentData,
} from "didcomm-wasm";

import * as Domain from "../../domain";
import { DIDCommDIDResolver } from "./DIDResolver";
import { DIDCommSecretsResolver } from "./SecretsResolver";
import { DIDCommProtocol } from "../DIDCommProtocol";
import { MercuryError } from "../../domain/models/Errors";

import { ProtocolType } from "../../edge-agent/protocols/ProtocolTypes";
import { isObject } from "../../utils";

export class DIDCommWrapper implements DIDCommProtocol {
  public static didcomm: typeof import("didcomm-wasm");
  private readonly didResolver: DIDResolver;
  private readonly secretsResolver: SecretsResolver;

  constructor(
    readonly apollo: Domain.Apollo,
    readonly castor: Domain.Castor,
    readonly pluto: Domain.Pluto
  ) {
    this.didResolver = new DIDCommDIDResolver(castor);
    this.secretsResolver = new DIDCommSecretsResolver(apollo, castor, pluto);
  }

  public static async getDIDComm() {

    if (!this.didcomm) {
      const DIDCommLib = await import("didcomm-wasm");
      const wasmInit = DIDCommLib.default;
      const wasm = await import("../../../externals/generated/didcomm-wasm/didcomm_js_bg.wasm");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await wasmInit(await wasm());
      this.didcomm = DIDCommLib;
    }


    return this.didcomm;
  }

  private doesRequireReturnRoute(type: string) {
    if (type === ProtocolType.DidcommMediationRequest) {
      return true;
    }
    if (type === ProtocolType.PickupReceived) {
      return true;
    }
    if (type === ProtocolType.PickupRequest) {
      return true;
    }
    if (type === ProtocolType.LiveDeliveryChange) {
      return true;
    }
    return false;
  }

  async packEncrypted(
    message: Domain.Message,
    toDid: Domain.DID,
    fromDid?: Domain.DID
  ): Promise<string> {
    const didcomm = await DIDCommWrapper.getDIDComm();
    const to = toDid.toString();
    const body = isObject(message.body) ? message.body : {};
    const didcommMsg = new didcomm.Message({
      id: message.id,
      typ: "application/didcomm-plain+json",
      type: message.piuri,
      body: body,
      to: [to],
      from: fromDid ? fromDid.toString() : undefined,
      from_prior: message.fromPrior,
      attachments: this.parseAttachments(message.attachments),
      created_time: Number(message.createdTime),
      //expires_time: Number(message.expiresTimePlus),
      thid: message.thid,
      pthid: message.pthid,
      ...(this.doesRequireReturnRoute(message.piuri)
        ? { return_route: "all" }
        : {}),
    });

    const [encryptedMsg] = await didcommMsg.pack_encrypted(
      to,
      fromDid ? fromDid.toString() : null,
      null,
      this.didResolver,
      this.secretsResolver,
      {
        enc_alg_anon: "Xc20pEcdhEsA256kw",
        enc_alg_auth: "A256cbcHs512Ecdh1puA256kw",
        forward: false,
        protect_sender: false,
      }
    );
    return encryptedMsg;
  }

  async unpack(message: string): Promise<Domain.Message> {
    const didcomm = await DIDCommWrapper.getDIDComm();
    const [didcommMsg] = await didcomm.Message.unpack(
      message,
      this.didResolver,
      this.secretsResolver,
      {
        expect_decrypt_by_all_keys: false,
        unwrap_re_wrapping_forward: false,
      }
    );

    const msgObj = didcommMsg.as_value();
    const toString = msgObj.to?.at(0);
    const domainMessage = new Domain.Message(
      msgObj.body,
      msgObj.id,
      msgObj.type,
      typeof msgObj.from === "string"
        ? Domain.DID.fromString(msgObj.from)
        : undefined,
      typeof toString === "string"
        ? Domain.DID.fromString(toString)
        : undefined,
      this.parseAttachmentsToDomain(msgObj.attachments ?? []),
      msgObj.thid,
      msgObj.extraHeaders,
      msgObj.created_time,
      msgObj.expires_time,
      [],
      undefined,
      msgObj.from_prior,
      msgObj.pthid
    );

    return domainMessage;
  }

  private parseAttachmentsToDomain(
    attachments: Attachment[]
  ): Domain.AttachmentDescriptor[] {
    return (attachments ?? []).reduce<Domain.AttachmentDescriptor[]>(
      (acc, x) => {
        try {
          const parsed = this.parseAttachmentToDomain(x);
          return acc.concat(parsed);
        } catch {
          return acc;
        }
      },
      []
    );
  }

  private parseAttachmentToDomain(
    attachment: Attachment
  ): Domain.AttachmentDescriptor {
    if (typeof attachment.id !== "string" || attachment.id.length === 0)
      throw new MercuryError.MessageAttachmentWithoutIDError();

    return new Domain.AttachmentDescriptor(
      this.parseAttachmentDataToDomain(attachment.data),
      attachment.media_type,
      attachment.id,
      attachment.filename?.split("/"),
      attachment.format,
      attachment.lastmod_time?.toString(),
      attachment.byte_count,
      attachment.description,
    );
  }

  private parseAttachmentDataToDomain(
    data: AttachmentData
  ): Domain.AttachmentData {
    if ("base64" in data) {
      const parsed: Domain.AttachmentBase64 = {
        base64: data.base64,
      };

      return parsed;
    }

    if ("json" in data) {
      const parsed: Domain.AttachmentJsonData = {
        data: data.json,
      };

      return parsed;
    }

    if ("links" in data) {
      const parsed: Domain.AttachmentLinkData = {
        hash: data.hash,
        links: data.links,
      };

      return parsed;
    }

    throw new MercuryError.UnknownAttachmentDataError();
  }

  private parseAttachments(
    attachments?: Domain.AttachmentDescriptor[]
  ): Attachment[] | undefined {
    return attachments?.reduce<Attachment[]>((acc, x) => {
      try {
        const parsed = this.parseAttachment(x);
        return acc.concat(parsed);
      } catch {
        return acc;
      }
    }, []);
  }

  private parseAttachment(attachment: Domain.AttachmentDescriptor): Attachment {
    return {
      data: this.parseAttachmentData(attachment.data),
      id: attachment.id,
      byte_count: attachment.byteCount ?? undefined,
      description: attachment.description ?? undefined,
      filename: attachment.filename?.join("/"),
      format: attachment.format ?? undefined,
      lastmod_time:
        typeof attachment.lastModTime === "string"
          ? Number(attachment.lastModTime)
          : undefined,
      media_type: attachment.mediaType ?? undefined,
    };
  }

  private parseAttachmentData(data: Domain.AttachmentData): AttachmentData {
    if ("base64" in data) {
      const parsed: Base64AttachmentData = {
        base64: data.base64,
        jws: "jws" in data ? data.jws.signature : undefined,
      };

      return parsed;
    }

    if ("data" in data) {
      const parsed: JsonAttachmentData = {
        json: JSON.parse(data.data),
      };

      return parsed;
    }

    if ("links" in data) {
      const parsed: LinksAttachmentData = {
        hash: data.hash,
        links: data.links,
      };

      return parsed;
    }

    throw new MercuryError.UnknownAttachmentDataError();
  }
}
