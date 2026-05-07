import { C } from '../../tokens'

interface HeaderProps {
  greeting: string
  sub: string
  dark?: boolean
}

export function Header({ greeting, sub, dark = true }: HeaderProps) {
  return (
    <div style={{ padding: '10px 20px 14px', color: dark ? C.cream : C.dark }}>
      <div className="badge" style={{ fontSize: 11, letterSpacing: '0.2em', opacity: 0.65 }}>
        ADADV3NTURE
      </div>
      <div className="badge" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 2 }}>
        {greeting}
      </div>
      <div className="mono" style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
        {sub}
      </div>
    </div>
  )
}
