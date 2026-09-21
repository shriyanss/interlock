import { notFound } from "next/navigation";
import { getMissionsByCountry } from "@/lib/missions";
import { TechTree } from "@/components/TechTree";

export default async function NationPage({ params }: PageProps<"/nations/[nation]">) {
  const { nation } = await params;
  const missions = getMissionsByCountry(nation);

  if (missions.length === 0) notFound();

  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="font-mono text-2xl uppercase text-neutral-100">{nation}</h1>
      <p className="mt-2 text-sm text-neutral-500">Chronological mission progression.</p>
      <div className="mt-10">
        <TechTree missions={missions} />
      </div>
    </main>
  );
}
