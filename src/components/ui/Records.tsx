import type { ReactNode } from 'react'

export const RecordEntry = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <article className="clue mt-4 border-t border-[#3c4c31] pt-[15px]">
    <strong className="text-xs text-[#c6d8b5]">{title}</strong>
    <div className="text-xs leading-[1.95] text-[#9fb48e] [&>p]:mt-[9px] [&>p]:mb-0">
      {children}
    </div>
  </article>
)

export const RecordList = ({ title, items }: { title: string; items: readonly string[] }) => (
  <section className="my-4">
    <h3>{title}</h3>
    <ul className="space-y-1 pl-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </section>
)
