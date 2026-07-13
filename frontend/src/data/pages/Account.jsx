import { RiBankLine, RiCoinLine, RiFileTextLine, RiHomeLine, RiNotificationLine, RiWalletLine, RiMapPinLine, RiDownload2Line, RiMoneyDollarCircleLine, RiRepeatLine } from 'react-icons/ri';

export const sidebarMenu = [
  {
    title: 'Dashboard',
    icon: <RiHomeLine className='me-2'/>,
    id: 'dashboard',
    path: '/account/dashboard',
  },
  {
    title: 'Notifications',
    icon: <RiNotificationLine className='me-2'/>,
    id: 'notification',
    path: '/account/notification',
  },
  {
    title: 'MyWallet',
    icon: <RiWalletLine className='me-2'/>,
    id: 'wallet',
    path: '/account/wallet',
  },
  {
    title: 'EarningPoints',
    icon: <RiCoinLine className='me-2'/>,
    id: 'point',
    path: '/account/point',
  },
  {
    title: 'MyOrders',
    icon: <RiFileTextLine className='me-2'/>,
    id: 'order',
    path: '/account/order',
  },
  {
    title: 'RefundHistory',
    icon: <RiMoneyDollarCircleLine className='me-2'/>,
    id: 'refund',
    path: '/account/refund',
  },
 {
  title: 'ExchangeHistory',
  icon: <RiRepeatLine className='me-2' />,
  id: 'exchange',
  path: '/account/exchange',
},
  {
    title: 'SavedAddress',
    icon: <RiMapPinLine className='me-2'/>,
    id: 'address',
    path: '/account/addresses',
  },
];
