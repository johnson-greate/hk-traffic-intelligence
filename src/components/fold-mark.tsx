import type { CSSProperties, ReactNode } from "react"

export function FoldMark(props: { open: boolean }) {
  return <span aria-hidden="true" className={props.open ? "fold-mark fold-mark-open" : "fold-mark"} />
}

export function Fold(props: { open: boolean; across?: boolean; live?: boolean; className?: string; id?: string; style?: CSSProperties; children: ReactNode }) {
  const classes = ["fold", props.open ? "fold-open" : "", props.across ? "fold-across" : "", props.className ?? ""].filter(Boolean).join(" ")
  return (
    <div id={props.id} className={classes} style={props.style}>
      <div className="fold-clip" inert={props.live || props.open ? undefined : true}>
        {props.children}
      </div>
    </div>
  )
}
