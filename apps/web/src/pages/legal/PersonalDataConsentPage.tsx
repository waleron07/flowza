import { Box, Container, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PERSONAL_DATA_AGREEMENT_VERSION } from '../../shared/constants/personal-data-agreement'

export function PersonalDataConsentPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography component="h1" sx={{ mb: 2 }} variant="h4">
        Согласие на обработку персональных данных
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }} variant="body2">
        Версия документа: {PERSONAL_DATA_AGREEMENT_VERSION}. Действует для сервиса Flowza при
        регистрации и использовании личного кабинета.
      </Typography>

      <Typography paragraph variant="body1">
        Настоящим я даю согласие оператору сервиса Flowza (далее — <strong>Оператор</strong>) на
        обработку моих персональных данных на условиях, изложенных ниже.
      </Typography>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        1. Цели обработки
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        <Typography component="li" paragraph variant="body1">
          регистрация и идентификация пользователя в сервисе;
        </Typography>
        <Typography component="li" paragraph variant="body1">
          исполнение договора оферты (оформление и обработка заказов, доставка, коммуникации по
          заказу);
        </Typography>
        <Typography component="li" paragraph variant="body1">
          направление кода подтверждения на адрес электронной почты и иные уведомления, связанные с
          учётной записью;
        </Typography>
        <Typography component="li" paragraph variant="body1">
          обеспечение безопасности (в том числе защита от злоупотреблений и автоматизированных
          запросов);
        </Typography>
        <Typography component="li" paragraph variant="body1">
          соблюдение требований законодательства Российской Федерации.
        </Typography>
      </Box>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        2. Перечень обрабатываемых данных
      </Typography>
      <Typography paragraph variant="body1">
        Обрабатываются персональные данные, которые вы указываете при регистрации и использовании
        сервиса, в том числе:
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        <Typography component="li" paragraph variant="body1">
          номер телефона (формат РФ, например +79991234567);
        </Typography>
        <Typography component="li" paragraph variant="body1">
          адрес электронной почты;
        </Typography>
        <Typography component="li" paragraph variant="body1">
          логин (уникальное имя учётной записи);
        </Typography>
        <Typography component="li" paragraph variant="body1">
          пароль в виде криптографического преобразования (хэша); исходный пароль Оператором не
          хранится;
        </Typography>
        <Typography component="li" paragraph variant="body1">
          технические данные, автоматически передаваемые при обращении к сервису (например, сетевой
          адрес и сведения о запросе), в объёме, необходимом для работы сайта и защиты от злоупотреблений.
        </Typography>
      </Box>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        3. Действия с персональными данными
      </Typography>
      <Typography paragraph variant="body1">
        Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение),
        извлечение, использование, передача (предоставление, доступ), обезличивание, блокирование,
        удаление, уничтожение — с использованием средств автоматизации и без таковых, в объёме,
        необходимом для указанных целей.
      </Typography>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        4. Срок действия согласия и хранение
      </Typography>
      <Typography paragraph variant="body1">
        Согласие действует до его отзыва либо до прекращения обработки в случаях, предусмотренных
        законом. Данные хранятся не дольше, чем этого требуют цели обработки, если иное не
        установлено законодательством.
      </Typography>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        5. Права субъекта персональных данных
      </Typography>
      <Typography paragraph variant="body1">
        Вы вправе запросить сведения об обработке, потребовать уточнения, блокирования или удаления
        данных, отозвать согласие, обратиться с жалобой в уполномоченный орган по защите прав
        субъектов персональных данных. Отзыв согласия может повлечь невозможность использования
        отдельных функций сервиса, для которых обработка данных необходима.
      </Typography>

      <Typography sx={{ mt: 2, mb: 1 }} variant="h6">
        6. Контакты Оператора
      </Typography>
      <Typography paragraph variant="body1">
        По вопросам обработки персональных данных направляйте обращения через контактные данные,
        указанные на сайте сервиса Flowza (раздел контактов / поддержки), либо по e-mail,
        указанному в публичной оферте, когда он будет опубликован.
      </Typography>

      <Typography sx={{ mt: 3 }} variant="body2">
        <Link component={RouterLink} to="/register" variant="body2">
          ← К регистрации
        </Link>
        {' · '}
        <Link component={RouterLink} to="/menu" variant="body2">
          В каталог
        </Link>
      </Typography>
    </Container>
  )
}
