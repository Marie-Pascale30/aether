import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/**
 * Valide un corps / une query avec un schéma Zod partagé (`@aether/shared`).
 * En cas d'erreur : 400 avec `message` (liste lisible) et `issues` (chemins, pour les formulaires).
 */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
    constructor(private readonly schema: T) {}

    transform(value: unknown): z.output<T> {
        const result = this.schema.safeParse(value ?? {});
        if (result.success) return result.data;

        const issues = result.error.issues.map((issue) => ({
            path: issue.path.map((key) => (typeof key === "symbol" ? String(key) : key)),
            message: issue.message,
        }));
        throw new BadRequestException({
            statusCode: 400,
            error: "Bad Request",
            message: issues.map((issue) => issue.message),
            issues,
        });
    }
}
