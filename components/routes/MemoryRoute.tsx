type MemoryItem = {
  link: string;
  title: string;
  memory: string;
  conversations: number;
};

const items: Array<MemoryItem> = [
  {
    link: "ndle.im/a8x9k2",
    title: "How to Build a SaaS Product",
    memory:
      "Saved for reference on product development strategies. Key insights about MVP approach.",
    conversations: 5,
  },
  {
    link: "ndle.im/m3p7q1",
    title: "Getting Started Documentation",
    memory:
      "Important onboarding resource. Contains setup instructions for new team members.",
    conversations: 12,
  },
  {
    link: "ndle.im/p4r8t3",
    title: "Analytics Dashboard Features",
    memory:
      "Competitor analysis reference. Good examples of data visualization patterns.",
    conversations: 3,
  },
];

export default function MemoryRoute() {
  return (
    <>
      <header>
        <h1 className="font-mono text-3xl font-medium tracking-tight">
          Memory & Conversations
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          AI-powered summaries, notes, and conversations about your links
        </p>
      </header>
      <section aria-labelledby="memory-section-heading">
        <h2 className="sr-only" id="memory-section-heading">
          Memory Items
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.link}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {item.link}
                    </span>
                    <span className="rounded-full bg-[#fbbf24] px-2 py-0.5 font-mono text-xs text-foreground">
                      Memory
                    </span>
                  </div>
                  <h3 className="mt-2 font-mono text-base font-medium">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    {item.memory}
                  </p>
                  <div className="mt-4 flex gap-4 font-mono text-xs text-muted-foreground">
                    <span>{item.conversations} conversations</span>
                    <span>Last updated 2 days ago</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
