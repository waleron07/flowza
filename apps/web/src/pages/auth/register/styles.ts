export const sx = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 2,
    py: 4,
    background:
      'linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, rgba(246, 248, 251, 1) 100%)',
  },
  paper: {
    width: '100%',
    maxWidth: 520,
    p: { xs: 3, sm: 4 },
    borderRadius: 4,
  },
  header: {
    mb: 3,
  },
  title: {
    mb: 1,
    fontWeight: 700,
  },
  subtitle: {
    color: 'text.secondary',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  checkbox: {
    alignItems: 'flex-start',
    ml: 0,
  },
  submitButton: {
    mt: 1,
    minHeight: 48,
  },
  secondaryAction: {
    mt: 1,
  },
} as const
