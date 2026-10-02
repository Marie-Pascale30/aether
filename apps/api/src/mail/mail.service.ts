import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import nodemailer, { type Transporter } from "nodemailer";
import { ENV, type Env } from "../config/env";

export interface Mail {
    to: string;
    subject: string;
    text: string;
    html: string;
}

/** Dossier où sont écrits les e-mails quand MAIL_TRANSPORT=log (relatif au dossier de l'API). */
export const OUTBOX_DIR = ".mail-outbox";

/**
 * Envoi d'e-mails. En développement (`log`), rien ne part : chaque message est écrit en JSON
 * dans `.mail-outbox/` pour pouvoir suivre les liens à la main ou dans les tests.
 */
@Injectable()
export class MailService {
    private readonly transporter: Transporter | null;

    constructor(
        @Inject(ENV) private readonly env: Env,
        @InjectPinoLogger(MailService.name) private readonly logger: PinoLogger,
    ) {
        this.transporter = env.MAIL_TRANSPORT === "smtp" && env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
    }

    async send(mail: Mail): Promise<void> {
        if (!this.transporter) {
            await mkdir(OUTBOX_DIR, { recursive: true });
            const file = join(OUTBOX_DIR, `${Date.now()}-${mail.to.replace(/[^a-z0-9]+/gi, "_")}.json`);
            await writeFile(file, JSON.stringify({ ...mail, from: this.env.MAIL_FROM, sentAt: new Date().toISOString() }, null, 2));
            this.logger.info({ to: mail.to, subject: mail.subject, file }, "E-mail écrit dans la boîte d'envoi locale");
            return;
        }
        await this.transporter.sendMail({ from: this.env.MAIL_FROM, ...mail });
        this.logger.info({ to: mail.to, subject: mail.subject }, "E-mail envoyé");
    }
}
