import { redirect } from "next/navigation";

/** Ancienne carte des énigmes : les énigmes sont désormais rangées par monde. */
export default function LevelsPage() {
    redirect("/mondes");
}
