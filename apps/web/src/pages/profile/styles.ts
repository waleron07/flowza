export const sx = {
  root: {
    minHeight: '100vh',
    px: { xs: 2, md: 4 },
    py: { xs: 3, md: 5 },
    background:
      'linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, rgba(246, 248, 251, 1) 100%)',
  },
  container: {
    maxWidth: 760,
    mx: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  header: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    gap: 2,
  },
  title: {
    fontWeight: 700,
  },
  subtitle: {
    color: 'text.secondary',
    mt: 1,
  },
  card: {
    p: { xs: 3, sm: 4 },
    borderRadius: 4,
  },
  infoGrid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  },
  infoItem: {
    p: 2,
    borderRadius: 3,
    backgroundColor: 'grey.50',
    border: '1px solid',
    borderColor: 'divider',
  },
  infoLabel: {
    color: 'text.secondary',
    mb: 0.5,
  },
  actions: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 2,
    mt: 3,
  },
} as const
