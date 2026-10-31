// Developer / About — an engineering case file for Ruchit Blaggana.
// Presented as the final chapter of a technical field notebook.

import { Panel, Badge, Stat } from '@/components/ui';
import {
  GraduationCap, Cpu, Lightbulb, Award, Users, BookOpen, Wrench, Droplets,
  Recycle, HeartHandshake, Medal, Trophy, Camera, Leaf, ShieldQuestion, Network, Activity,
} from 'lucide-react';

export function DeveloperView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header — case file */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-500/30 bg-ink-800/60">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-signal-amber/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative px-6 py-8 sm:px-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-amber">Case File · 2026-10</span>
            <span className="h-px flex-1 bg-ink-500/30" />
            <span className="font-mono text-[10px] text-text-faint">SZ-DEV-001</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-text text-balance leading-tight">
            Ruchit Blaggana
          </h1>
          <p className="text-sm text-text-dim mt-2 max-w-xl leading-relaxed">
            Computer Science student, Delhi Public School, Vasant Kunj, New Delhi. Builder of Signal Zero — an urban systems resilience laboratory exploring how interconnected infrastructure fails, and how algorithmic thinking can guide recovery.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge tone="amber"><GraduationCap className="w-3 h-3" /> Grade 12, pursuing</Badge>
            <Badge tone="teal"><Cpu className="w-3 h-3" /> Computer Science</Badge>
            <Badge tone="dim">USA · Canada · Australia</Badge>
          </div>
        </div>
      </div>

      {/* About the developer */}
      <Section icon={BookOpen} title="About the Developer" subtitle="The person behind the project">
        <p className="text-sm text-text-dim leading-relaxed">
          Ruchit is a Grade 12 Computer Science student at Delhi Public School, Vasant Kunj, with an interest in
          how interconnected systems behave under stress. Signal Zero is his attempt to turn that curiosity into a
          working laboratory — not a dashboard that passively displays data, but a tool that lets you feel the shape
          of a dependency graph by breaking it on purpose and watching what happens.
        </p>
        <p className="text-sm text-text-dim leading-relaxed mt-3">
          The project sits at the intersection of three things he finds compelling: graph algorithms that do real
          work, simulations that produce reproducible cause-and-effect, and interfaces that explain themselves
          rather than hide their assumptions. His intended study destinations are the United States, Canada, and
          Australia, where he plans to pursue Computer Science further.
        </p>
      </Section>

      {/* Academic record */}
      <Section icon={GraduationCap} title="Academic Record" subtitle="Verified aggregates">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Grade 9" value="93.2%" tone="teal" />
          <Stat label="Grade 10" value="94.4%" tone="teal" />
          <Stat label="Grade 11" value="80.4%" tone="amber" />
          <Stat label="Grade 12" value="Pursuing" mono={false} tone="amber" />
        </div>
        <p className="text-[11px] text-text-faint mt-3 italic">
          Grade 12 is ongoing. No final result, graduation date, or university admission has been determined. No standardised test scores (SAT, TOEFL) are reported because none have been taken.
        </p>
      </Section>

      {/* Engineering case study */}
      <Section icon={Wrench} title="Engineering & Technical Experience" subtitle="Featured STEM project">
        <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-signal-amber" />
            <h3 className="text-sm font-semibold text-text">Assistive Technology — Smart Hat for the Visually Impaired</h3>
          </div>
          <p className="text-sm text-text-dim leading-relaxed">
            Through a summer program in AI, Machine Learning, and Robotics at IIT Delhi, conducted via Rancho Labs,
            Ruchit designed and developed a smart hat that helps visually impaired users detect overhead obstacles —
            a class of hazard that traditional white canes cannot reliably sense.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <TechCard label="Controller" value="Arduino Uno" icon={Cpu} />
            <TechCard label="Sensors" value="Ultrasonic" icon={Activity} />
            <TechCard label="Output" value="Alert feedback" icon={ShieldQuestion} />
          </div>
          <p className="text-sm text-text-dim leading-relaxed mt-3">
            The hat uses ultrasonic sensors to measure distance to obstacles above chest height. When an obstacle
            crosses a threshold, the device triggers an alert, giving the wearer time to react. The human-centered
            design goal is straightforward: extend the wearer's awareness into a region the cane cannot reach, without
            adding cognitive load. This project taught Ruchit that assistive technology is as much about restraint —
            choosing one reliable signal over five noisy ones — as it is about capability.
          </p>
          <p className="text-[11px] text-text-faint mt-3 italic">
            No accuracy percentages, user testing results, clinical validation, or commercial deployment claims are made. The project was a personal engineering exercise completed during an educational summer program.
          </p>
        </div>
      </Section>

      {/* Research */}
      <Section icon={Lightbulb} title="Research & Innovation" subtitle="Ongoing work">
        <div className="space-y-2">
          <ResearchItem
            icon={Cpu}
            title="Patent Application — Instrument Co-development"
            status="Pending review"
            desc="Ruchit co-developed an innovative instrument for which a patent application has been filed and is currently pending review."
            note="No patent number, filing date, or grant status is available."
          />
          <ResearchItem
            icon={BookOpen}
            title="Research Assistance — Dentistry Article"
            status="Under publication"
            desc="Ruchit contributed data compilation and research assistance to a dentistry-related article that is currently under publication."
            note="No publication title, journal, or acceptance status is specified."
          />
        </div>
      </Section>

      {/* Achievements */}
      <Section icon={Award} title="Selected Achievements" subtitle="Verified awards and recognition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Achievement icon={Medal} label="Scholar Badge of Excellence" detail="Received consistently throughout school" />
          <Achievement icon={Trophy} label="Gold Medal — Academic Excellence" detail="Grade 11" />
          <Achievement icon={Award} label="Vigyan Vidyarthi Manthan" detail="Regional Rank 3 · School Rank 1" />
          <Achievement icon={Camera} label="National Photography Competition" detail="Second prize, national level" />
          <Achievement icon={Leaf} label="World Environment Day Global Quiz" detail="Certificate of Recognition" />
          <Achievement icon={Leaf} label="CMS Environmental Quiz Competition" detail="Certificate of Distinction" />
          <Achievement icon={Trophy} label="Inter-School Luminaire Competition" detail="Winning team · Rolling Trophy" />
          <Achievement icon={Medal} label="Inter-School Swimming Competition" detail="Bronze medal, 2024" />
        </div>
      </Section>

      {/* Leadership & community */}
      <Section icon={Users} title="Leadership & Community Impact" subtitle="Service beyond the classroom">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
            <Users className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text font-medium">Secretary, Interact Club</p>
              <p className="text-[11px] text-text-dim mt-0.5">Led community outreach, fundraising, volunteer coordination, and social impact initiatives. Received a Letter of Recommendation from the Interact Club.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
            <HeartHandshake className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text font-medium">Fundraising & Welfare Activities</p>
              <p className="text-[11px] text-text-dim mt-0.5">Organised fundraising activities supporting orphanages, elderly care, and social welfare programs.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
            <GraduationCap className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text font-medium">Financial Literacy Workshop</p>
              <p className="text-[11px] text-text-dim mt-0.5">Designed and conducted a financial literacy workshop for government-school students.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
            <Recycle className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text font-medium">Sustainability Initiatives</p>
              <p className="text-[11px] text-text-dim mt-0.5">Led paper recycling and textile sustainability initiatives.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
            <HeartHandshake className="w-4 h-4 text-signal-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text font-medium">Earth Saviours Foundation — Volunteer</p>
              <p className="text-[11px] text-text-dim mt-0.5">Supported homeless and elderly residents through caregiving, reading sessions, medicine distribution, and day-to-day assistance.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Why Signal Zero was built */}
      <Section icon={Network} title="Why Signal Zero Was Built" subtitle="The motivation">
        <p className="text-sm text-text-dim leading-relaxed">
          Modern infrastructure is a graph. A substation feeds a relay; the relay controls a signal; the signal
          routes an ambulance; the ambulance reaches a hospital that needs water. Cut one edge and the consequences
          travel along paths most people never see. Signal Zero exists to make those paths visible — not as an
          abstract diagram, but as something you can touch, break, and repair, and watch the city respond.
        </p>
        <p className="text-sm text-text-dim leading-relaxed mt-3">
          The project is also an exercise in restraint. Every metric has a formula. Every state has a reason.
          Every algorithm does what its label says — a path optimised for distance is never called "fastest."
          The two recovery strategies disagree on purpose, because real engineering trade-offs disagree.
          Heuristics are labelled as heuristics, not as optima. The goal is to show that software can help people
          understand complex failures and make better recovery decisions — and that the value of an algorithm is
          not its output, but the reasoning it makes inspectable.
        </p>
        <p className="text-sm text-text-dim leading-relaxed mt-3">
          This is presented as the project's motivation. It is not a direct quotation from Ruchit.
        </p>
      </Section>

      {/* Footer */}
      <div className="border-t border-ink-500/20 pt-4 pb-2 text-center">
        <p className="font-mono text-[10px] text-text-faint uppercase tracking-wider">
          Signal Zero · Every signal tells a story · Built by Ruchit Blaggana
        </p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Panel title={<span className="flex items-center gap-2 normal-case"><Icon className="w-4 h-4 text-signal-amber" /> <span className="font-display text-lg font-medium">{title}</span></span>} subtitle={subtitle} className="animate-slide-up">
      <div>{children}</div>
    </Panel>
  );
}

function TechCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-ink-500/30 bg-ink-900/40">
      <Icon className="w-4 h-4 text-signal-amber shrink-0" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-faint">{label}</p>
        <p className="text-xs text-text font-medium">{value}</p>
      </div>
    </div>
  );
}

function ResearchItem({ icon: Icon, title, status, desc, note }: { icon: React.ComponentType<{ className?: string }>; title: string; status: string; desc: string; note: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-ink-500/30 bg-ink-900/30">
      <Icon className="w-4 h-4 text-signal-amber shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-text font-medium">{title}</p>
          <Badge tone="amber">{status}</Badge>
        </div>
        <p className="text-[11px] text-text-dim mt-1 leading-snug">{desc}</p>
        <p className="text-[10px] text-text-faint mt-1 italic">{note}</p>
      </div>
    </div>
  );
}

function Achievement({ icon: Icon, label, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-ink-500/30 bg-ink-900/30">
      <Icon className="w-4 h-4 text-signal-amber shrink-0" />
      <div className="min-w-0">
        <p className="text-[12px] text-text leading-tight">{label}</p>
        <p className="text-[10px] text-text-faint truncate">{detail}</p>
      </div>
    </div>
  );
}
