import { Paper, Stack, Typography } from '@mui/material'

type SectionPlaceholderProps = {
  title: string
  description: string
}

export function SectionPlaceholder({
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        borderRadius: 4,
      }}
    >
      <Stack spacing={1.5}>
        <Typography component="h1" variant="h4" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Paper>
  )
}
