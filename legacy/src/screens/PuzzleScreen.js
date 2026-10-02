import { h } from "../core/dom.js";
import { t } from "../i18n/index.js";
import { MISMATCH_FEEDBACK_MS } from "../config.js";
import { LEVELS } from "../data/levels.js";
import { store, actions, selectors } from "../game/state.js";
import { Puzzle } from "../game/Puzzle.js";
import { Panel } from "../components/Panel.js";
import { Hint } from "../components/Hint.js";
import { Button } from "../components/Button.js";
import { Board } from "../components/Board.js";
import { StatusMessage } from "../components/StatusMessage.js";

export function PuzzleScreen({ navigate }) {
    const { levelIndex } = store.get();
    const level = selectors.currentLevel();
    const linksBefore = selectors.linksBeforeCurrentLevel();
    const puzzle = new Puzzle(level);
    let feedbackTimer = null;

    const progress = h("div", { class: "progress" });
    const status = StatusMessage(t.puzzle.status.idle);
    const board = Board({ symbols: level.symbols, onPick: handlePick });
    const nextButton = Button({ label: t.puzzle.next, variant: "primary", hidden: true, onClick: handleNext });
    const resetButton = Button({ label: t.puzzle.reset, onClick: () => navigate("puzzle") });

    function updateProgress() {
        progress.textContent = t.puzzle.restored(linksBefore + puzzle.foundCount);
    }

    function handlePick(index) {
        const result = puzzle.select(index);

        switch (result.type) {
            case "selected":
                board.select(index);
                break;

            case "deselected":
                board.select(index, false);
                break;

            case "match":
                board.select(index);
                board.link(result.pair);
                handleMatch();
                break;

            case "mismatch":
                board.select(index);
                status.set(t.puzzle.status.mismatch, "fail");
                feedbackTimer = setTimeout(() => {
                    result.pair.forEach((i) => board.select(i, false));
                    puzzle.clearSelection();
                    status.set(t.puzzle.status.retry);
                }, MISMATCH_FEEDBACK_MS);
                break;
        }
    }

    function handleMatch() {
        updateProgress();

        if (!puzzle.isComplete) {
            status.set(t.puzzle.status.partial(puzzle.remaining), "success");
            return;
        }

        status.set(t.puzzle.status.complete, "success");
        actions.completeCurrentLevel();
        nextButton.hidden = false;
        nextButton.focus();
    }

    function handleNext() {
        navigate(actions.advance() ? "puzzle" : "end");
    }

    updateProgress();

    const el = Panel(
        {},
        h(
            "div",
            { class: "puzzle-head" },
            h(
                "div",
                {},
                h("div", { class: "level" }, t.puzzle.level(levelIndex + 1, LEVELS.length)),
                h("h2", {}, level.title),
            ),
            progress,
        ),
        h("p", {}, level.description),
        Hint({ label: t.puzzle.hintLabel, text: level.hint }),
        board.el,
        status.el,
        h("div", { class: "actions" }, resetButton, nextButton),
    );

    return {
        el,
        destroy() {
            clearTimeout(feedbackTimer);
        },
    };
}
