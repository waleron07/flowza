import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useMemo, useState, type CSSProperties } from 'react'
import {
  getCategoriesForOrganization,
  getOrganizationById,
  getProductsForOrganization,
} from '../../shared/data/menu-data'
import { useAuth } from '../../features/auth/model/useAuth'
import { useCartStore } from '../../shared/store/cart-store'
import { useOrganizationStore } from '../../shared/store/organization-store'
import { sx } from './styles'

export function MenuPage() {
  const { status } = useAuth()
  const addItem = useCartStore((state) => state.addItem)
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const selectedOrganization = getOrganizationById(selectedOrganizationId)
  const categories = getCategoriesForOrganization(selectedOrganizationId)
  const organizationProducts = getProductsForOrganization(selectedOrganizationId)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') {
      return organizationProducts
    }

    return organizationProducts.filter((product) => product.categoryId === selectedCategoryId)
  }, [organizationProducts, selectedCategoryId])

  return (
    <Box>
      <Box sx={sx.header}>
        <Typography component="h1" variant="h3">
          Меню {selectedOrganization.name}
        </Typography>
        <Typography sx={sx.subtitle} variant="body1">
          Это публичная часть приложения в контексте выбранной организации. Гость может
          смотреть меню и собирать корзину без обязательной авторизации, но категории, товары
          и цены зависят от активной организации.
        </Typography>

        <Stack direction="row" spacing={1} sx={sx.categories}>
          <Chip
            color={selectedCategoryId === 'all' ? 'primary' : 'default'}
            label="Все"
            onClick={() => {
              setSelectedCategoryId('all')
            }}
          />
          {categories.map((category) => (
            <Chip
              color={selectedCategoryId === category.id ? 'primary' : 'default'}
              key={category.id}
              label={category.name}
              onClick={() => {
                setSelectedCategoryId(category.id)
              }}
            />
          ))}
          <Chip
            color={status === 'authenticated' ? 'secondary' : 'default'}
            label={status === 'authenticated' ? 'Режим клиента User' : 'Режим Guest'}
            variant="outlined"
          />
        </Stack>
      </Box>

      <Box sx={sx.grid}>
        {filteredProducts.map((product) => (
          <Card elevation={0} key={product.id} sx={sx.card}>
            <img alt={product.name} src={product.image} style={sx.media as CSSProperties} />
            <CardContent sx={sx.cardContent}>
              <Box>
                <Typography component="h2" variant="h5">
                  {product.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
                  {product.description}
                </Typography>
              </Box>

              <Box sx={sx.cardFooter}>
                <Paper
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    bgcolor: 'grey.100',
                  }}
                >
                  <Typography fontWeight={700} variant="body1">
                    {product.price} RUB
                  </Typography>
                </Paper>
                <Button
                  onClick={() => {
                    addItem(selectedOrganizationId, product.id)
                  }}
                  variant="contained"
                >
                  В корзину
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
