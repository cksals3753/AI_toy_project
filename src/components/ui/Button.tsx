import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'text'
  full?: boolean
}

export const Button = ({
  variant = 'primary',
  full = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={[
      variant === 'primary'
        ? 'primary min-h-11 rounded border border-[#c4d8a1] bg-[#c4d8a1] px-[18px] py-[13px] text-xs font-[650] text-[#1f2c16] enabled:hover:bg-[#d5e9b2]'
        : 'text-button mx-auto block border-0 bg-transparent p-3.5 text-[11px] text-[#b1c49b]',
      full ? 'full mt-6 block w-full' : '',
      'transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7dd9b] disabled:cursor-default disabled:opacity-40',
      className,
    ].join(' ')}
    {...props}
  />
)
