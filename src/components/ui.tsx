import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const feldKlassen =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-alpen-500 focus:ring-2 focus:ring-alpen-500/20 disabled:bg-slate-100'

export function Feld({
  label,
  hinweis,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  label: string
  hinweis?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1" {...props}>
      <span className="text-xs font-medium tracking-wide text-slate-600 uppercase">
        {label}
      </span>
      {children}
      {hinweis ? <span className="block text-xs text-slate-500">{hinweis}</span> : null}
    </label>
  )
}

export function Eingabe(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${feldKlassen} ${props.className ?? ''}`} />
}

export function Auswahl(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${feldKlassen} ${props.className ?? ''}`} />
}

export function Textfeld(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${feldKlassen} ${props.className ?? ''}`} />
}

type KnopfVariante = 'primaer' | 'sekundaer' | 'gefahr' | 'still'

const knopfKlassen: Record<KnopfVariante, string> = {
  primaer: 'bg-alpen-600 text-white hover:bg-alpen-700 shadow-sm',
  sekundaer: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  gefahr: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  still: 'text-slate-600 hover:bg-slate-100',
}

export function Knopf({
  variante = 'sekundaer',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: KnopfVariante }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${knopfKlassen[variante]} ${className}`}
    />
  )
}

export function Karte({
  titel,
  aktion,
  className = '',
  children,
}: {
  titel?: string
  aktion?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {titel || aktion ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          {titel ? (
            <h2 className="text-sm font-semibold text-slate-900">{titel}</h2>
          ) : (
            <span />
          )}
          {aktion}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Kennzahl({
  label,
  wert,
  zusatz,
  ton = 'neutral',
}: {
  label: string
  wert: string
  zusatz?: string
  ton?: 'neutral' | 'gut' | 'warnung' | 'schlecht'
}) {
  const toene = {
    neutral: 'text-slate-900',
    gut: 'text-emerald-600',
    warnung: 'text-amber-600',
    schlecht: 'text-red-600',
  } as const
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toene[ton]}`}>
        {wert}
      </div>
      {zusatz ? <div className="mt-0.5 text-xs text-slate-500">{zusatz}</div> : null}
    </div>
  )
}

export function Etikett({
  children,
  ton = 'grau',
}: {
  children: ReactNode
  ton?: 'grau' | 'blau' | 'gruen' | 'gelb' | 'rot'
}) {
  const toene = {
    grau: 'bg-slate-100 text-slate-700',
    blau: 'bg-alpen-100 text-alpen-700',
    gruen: 'bg-emerald-100 text-emerald-700',
    gelb: 'bg-amber-100 text-amber-700',
    rot: 'bg-red-100 text-red-700',
  } as const
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${toene[ton]}`}
    >
      {children}
    </span>
  )
}

export function LeerZustand({ text, aktion }: { text: string; aktion?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      {aktion ? <div className="mt-3 flex justify-center">{aktion}</div> : null}
    </div>
  )
}

export function Seitenkopf({
  titel,
  beschreibung,
  aktion,
}: {
  titel: string
  beschreibung?: string
  aktion?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{titel}</h1>
        {beschreibung ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{beschreibung}</p>
        ) : null}
      </div>
      {aktion ? <div className="flex gap-2 kein-druck">{aktion}</div> : null}
    </div>
  )
}
