import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

/**
 * Les deux erreurs levées par des bibliothèques (en anglais) que le joueur peut rencontrer :
 * la limitation de débit, et une route inconnue (« Cannot GET /… » de Nest).
 */
function libraryMessage(status: number, message: unknown): string | null {
    if (status === HttpStatus.TOO_MANY_REQUESTS) return "Trop de tentatives d'affilée : patiente une minute avant de réessayer.";
    if (status === HttpStatus.NOT_FOUND && typeof message === "string" && message.startsWith("Cannot ")) {
        return "Cette route n'existe pas.";
    }
    return null;
}

/**
 * Format d'erreur unique pour toute l'API. Les erreurs prévues (HttpException) sont renvoyées
 * telles quelles ; les autres sont journalisées avec leur trace et masquées derrière un message
 * générique, accompagné de l'identifiant de requête pour retrouver le journal.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
    constructor(@InjectPinoLogger(ErrorFilter.name) private readonly logger: PinoLogger) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const http = host.switchToHttp();
        const res = http.getResponse<Response>();
        const req = http.getRequest<Request & { id?: string }>();
        const requestId = req.id ? String(req.id) : undefined;

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const payload = typeof body === "string" ? { message: body } : (body as Record<string, unknown>);
            const translated = libraryMessage(status, payload.message);

            res.status(status).json({ ...payload, statusCode: status, ...(translated && { message: translated }), requestId });
            return;
        }

        this.logger.error({ err: exception, requestId, route: `${req.method} ${req.url}` }, "Erreur non gérée");
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Internal Server Error",
            message: "Une erreur interne est survenue. Réessaie dans un instant.",
            requestId,
        });
    }
}
