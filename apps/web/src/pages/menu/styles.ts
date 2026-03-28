export const sx = {
  header: {
    mb: 4,
  },
  subtitle: {
    color: 'text.secondary',
    maxWidth: 760,
    mt: 1,
  },
  categories: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    mt: 3,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      md: 'repeat(2, minmax(0, 1fr))',
      xl: 'repeat(3, minmax(0, 1fr))',
    },
    gap: 3,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 4,
    overflow: 'hidden',
    height: '100%',
  },
  media: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flexGrow: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    mt: 'auto',
  },
} as const
