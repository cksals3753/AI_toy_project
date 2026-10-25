import * as T from 'three'
import type { Entity, Rect } from './world'
type Box = (r: Rect, h: number, m: T.Material, bottom?: number, solid?: boolean) => T.Mesh
type Label = (
  text: string,
  r: Rect,
  height: number,
  rotation?: number,
  color?: string,
  kind?: string,
) => T.Mesh
export const addChapter2Facility = (
  e: Entity,
  box: Box,
  label: Label,
  m: { metal: T.Material; dark: T.Material; amber: T.Material; blue: T.Material },
  switches: T.Mesh[],
  keys: T.Mesh[],
) => {
  const { metal, dark, amber, blue } = m
  if (e.id === 'hall-map') {
    // A shallow frame at the north wall, not a floor-to-ceiling opaque plinth.
    box({ x: e.x - 2, y: 78, w: e.w + 4, h: 6 }, 1.35, metal, 0.95)
    label(
      'B2 구역 안내\n직원 설비 ← 대합실 → 승강장',
      { x: 480, y: 85, w: 78, h: 48 },
      1.63,
      0,
      e.color,
      'map',
    )
  } else if (e.id === 'hall-window') {
    // Inspection grille, visible conduits, analog meter and a small status lamp.
    box({ x: e.x, y: e.y, w: e.w, h: 35 }, 1.65, metal, 0.35)
    box({ x: e.x + 6, y: 151, w: e.w - 12, h: 7 }, 1.2, dark, 0.55)
    for (let i = 0; i < 7; i++) box({ x: e.x + 9 + i * 8, y: 158, w: 3, h: 2 }, 0.72, metal, 0.55)
    box({ x: e.x + 7, y: 160, w: 23, h: 2 }, 0.26, amber, 1.4)
    box({ x: e.x + 17, y: 162, w: 2, h: 1 }, 0.17, dark, 1.45)
    box({ x: e.x + 51, y: 160, w: 7, h: 3 }, 0.09, blue, 1.47)
    label('V-02 · 설비\n누전 / 자동 폐쇄', { x: e.x + e.w / 2, y: 164, w: 38, h: 12 }, 1.13)
  } else if (e.id === 'hall-desk') {
    // Open counter, drawer and key hook; no large opaque cube above the worktop.
    box({ x: e.x, y: e.y, w: e.w, h: e.h }, 0.08, metal, 1.03)
    for (const x of [e.x + 4, e.x + e.w - 10]) box({ x, y: e.y + 4, w: 6, h: e.h - 8 }, 1.03, dark)
    box({ x: e.x + 24, y: e.y + 8, w: 62, h: 35 }, 0.5, amber, 0.4)
    box({ x: e.x + 30, y: e.y + 39, w: 50, h: 8 }, 0.32, metal, 0.48)
    box({ x: e.x + 48, y: e.y + 48, w: 16, h: 3 }, 0.05, dark, 0.65)
    const ring = box({ x: e.x + 52, y: e.y + 49, w: 4, h: 2 }, 0.14, amber, 0.86)
    ring.geometry.dispose()
    ring.geometry = new T.TorusGeometry(0.065, 0.014, 4, 8)
    const key = box({ x: e.x + 57, y: e.y + 49, w: 13, h: 2 }, 0.035, amber, 0.91)
    const tooth = box({ x: e.x + 65, y: e.y + 49, w: 2, h: 2 }, 0.08, amber, 0.86)
    for (const mesh of [ring, key, tooth]) {
      mesh.userData.merge = false
      keys.push(mesh)
    }
    label('안내 · KEY', { x: e.x + e.w / 2, y: e.y + e.h + 1, w: 30, h: 8 }, 0.84)
  } else if (e.id === 'powerboard') {
    box({ x: e.x, y: e.y, w: e.w, h: 49 }, 1.9, metal, 0.25)
    for (let i = 0; i < 3; i++) {
      const x = e.x + 5 + i * 28
      box({ x, y: 179, w: 24, h: 4 }, 1.25, dark, 0.55)
      for (let j = 0; j < 3; j++) box({ x: x + 3 + j * 7, y: 183, w: 4, h: 2 }, 0.07, metal, 1.47)
      const toggle = box({ x: x + 8, y: 185, w: 8, h: 5 }, 0.25, amber, 0.85)
      toggle.userData.merge = false
      switches.push(toggle)
      label(['조명', '개찰구', '방송'][i], { x: x + 12, y: 187, w: 24, h: 8 }, 1.3)
    }
    label('AUX · 최대 2회로', { x: e.x + e.w / 2, y: 187, w: 80, h: 12 }, 1.96)
  } else if (e.id === 'hall-gate-note') {
    box({ x: e.x, y: 183, w: e.w, h: 5 }, 0.95, metal, 0.65)
    for (const x of [e.x + 4, e.x + e.w - 7]) box({ x, y: 183, w: 3, h: 5 }, 0.65, dark)
    label(
      '비상 개방\n조명 + 개찰구\n최대 두 회로',
      { x: e.x + e.w / 2, y: 189, w: 43, h: 32 },
      1.14,
    )
  } else return false
  return true
}
