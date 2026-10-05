import { Controller, Get } from "@nestjs/common";
import type { ContentBundle } from "@aether/shared";
import { ContentService } from "./content.service";

@Controller("content")
export class ContentController {
    constructor(private readonly content: ContentService) {}

    /** Réservé aux joueurs (invités compris), comme le reste du jeu. */
    @Get()
    bundle(): Promise<ContentBundle> {
        return this.content.bundle();
    }
}
