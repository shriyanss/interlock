export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-6 py-16 text-neutral-300">
      <h1 className="font-mono text-2xl text-neutral-100">About INTERLOCK</h1>
      <p className="mt-4">
        INTERLOCK is an educational simulation of historically documented cyber-physical
        operations against operational technology (OT) and industrial infrastructure. Every
        mission recreates a real, publicly attributed or reported incident inside a fully local,
        synthetic, intentionally vulnerable lab — never against real infrastructure.
      </p>
      <h2 className="mt-8 font-mono text-lg text-neutral-100">Methodology</h2>
      <p className="mt-2">
        Every mission distinguishes <strong className="text-emerald-400">documented</strong> facts
        (directly stated by cited sources), <strong className="text-amber-400">reconstructed</strong>{" "}
        details (analyst inference from evidence), and{" "}
        <strong className="text-neutral-400">fictional</strong> elements introduced for gameplay.
        Any claimed relationship between a cyber operation and a military/kinetic action is labeled
        CONFIRMED, ASSOCIATED, CONTESTED, or UNKNOWN — never invented.
      </p>
      <h2 className="mt-8 font-mono text-lg text-neutral-100">Safety boundary</h2>
      <p className="mt-2">
        All offensive activity happens inside Docker labs built specifically for this project.
        INTERLOCK never attacks real infrastructure, never ships real malware or malicious
        documents, and never reproduces deployable exploits against real products.
      </p>
    </main>
  );
}
