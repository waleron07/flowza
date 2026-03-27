export const sx = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 2,
    py: 4,
    background:
      'linear-gradient(180deg, rgba(25, 118, 210, 0.08) 0%, rgba(247, 249, 252, 1) 100%)',
  },
  paper: {
    width: '100%',
    maxWidth: 440,
    p: { xs: 3, sm: 4 },
    borderRadius: 4,
    boxShadow: '0px 20px 40px rgba(15, 23, 42, 0.08)',
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
  submitButton: {
    mt: 1,
    minHeight: 48,
  },
  footerText: {
    mt: 2,
    color: 'text.secondary',
    textAlign: 'center',
  },
} as const
