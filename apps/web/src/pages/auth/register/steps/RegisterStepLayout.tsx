import { Box, Typography } from '@mui/material'
import type { PropsWithChildren } from 'react'
import { sx } from '../styles'

type RegisterStepLayoutProps = PropsWithChildren<{
  subtitle: string
  title: string
}>

export function RegisterStepLayout({ title, subtitle, children }: RegisterStepLayoutProps) {
  return (
    <>
      <Box sx={sx.header}>
        <Typography component="h1" variant="h4" sx={sx.title}>
          {title}
        </Typography>
        <Typography variant="body1" sx={sx.subtitle}>
          {subtitle}
        </Typography>
      </Box>
      {children}
    </>
  )
}
