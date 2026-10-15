import { survivor } from '../game/chapter3'
import { characters } from '../game/data'
export function Portrait({ who }: { who: string }) {
  const c = who === 'survivor' ? survivor : characters.find(character => character.id === who)
  const color = c?.color ?? '#99af95'
  const old = who === 'oh'
  return <svg className="portrait" viewBox="0 0 180 220" role="img" aria-label={`${c?.name ?? '생존자'} 초상화`}>
    <defs><linearGradient id={`portrait-${who}`} x2="1" y2="1"><stop stopColor={color}/><stop offset="1" stopColor="#203d32"/></linearGradient></defs>
    <rect width="180" height="220" rx="8" fill="#1c2923"/>
    <path d="M0 200L180 20M0 150L150 0M30 220L180 70" stroke={color} opacity=".08" strokeWidth="20"/>
    <path d="M17 220Q15 152 67 150H113Q165 152 163 220" fill={`url(#portrait-${who})`}/>
    <path d="M68 148L90 180L112 148L106 220H74Z" fill="#25342c"/>
    <path d="M77 130H103V158L90 172L77 158Z" fill="#af9780"/>
    <path d="M53 69Q48 22 90 25Q138 23 129 83L123 124Q90 160 59 124Z" fill="#c4ad94"/>
    <path d={old ? 'M48 82Q38 29 88 23Q141 21 134 86L116 57L68 61Z' : 'M48 90Q33 25 89 20Q143 18 133 89L112 53L57 81Z'} fill={old ? '#73796d' : '#30392f'}/>
    {who === 'kang' && <g><path d="M47 62Q43 25 90 22Q138 23 133 62Z" fill="#665c49"/><path d="M42 61Q90 47 139 61L135 70H47Z" fill="#9b9271"/><path d="M83 31h14v15H83z" fill="#b5bd92"/></g>}
    {who === 'seo' && <path d="M48 80Q29 120 46 155L60 146L55 78M121 66Q148 102 134 149L121 139Z" fill="#30392f"/>}
    {who === 'min' && <path d="M62 153L42 174L55 206L76 165M117 153L140 174L130 206L103 165" fill="#536f85"/>}
    <g className="portrait-eyes"><path d="M63 91H77M103 91H117" stroke="#3d4035" strokeWidth="3"/></g>
    <path d="M88 98L85 113H94M79 128Q90 132 102 126" fill="none" stroke="#856d59" strokeWidth="2"/>
    {who === 'survivor' && <g><path d="M58 71l35-7 2 12-35 7z" fill="#dbd6b3"/><path d="M66 69l10 10M79 66l10 10" stroke="#bfa488"/><path d="M113 145l25 67h-20l-29-55z" fill="#c9c5aa"/></g>}
    {old && <g fill="none" stroke="#485445" strokeWidth="3"><rect x="58" y="83" width="25" height="20" rx="5"/><rect x="98" y="83" width="25" height="20" rx="5"/><path d="M83 89H98"/></g>}
    <path d="M40 218L48 173M140 218L132 173" stroke="#101c16" strokeOpacity=".3" strokeWidth="3"/>
    <path d="M119 175h24v14h-24z" fill="#d4d9b1" opacity=".6"/><path d="M123 179h15M123 183h10" stroke="#384e3e" strokeWidth="2"/>
    <text x="12" y="206" fill="#e7efda" fontFamily="monospace" fontSize="9">{c?.name ?? 'YOU'} / LOCAL</text>
  </svg>
}
