# EMI Tracking Application

A comprehensive EMI tracking application built with React and Node.js, featuring a beautiful dashboard interface for tracking EMI payments, due dates, and financial obligations.

## Features

- **User Authentication**: Secure login and registration system
- **EMI Management**: Add, edit, and delete EMI entries with payment tracking
- **Category Management**: Organize EMIs with customizable categories
- **Payment Tracking**: Monitor EMI payments and due dates
- **Financial Reports**: Comprehensive analytics and insights
- **Responsive Dashboard**: Beautiful charts and visualizations
- **Real-time Updates**: Live data updates and notifications

## Tech Stack

### Frontend
- React 18+
- Reactstrap (Bootstrap 4 for React)
- Chart.js with react-chartjs-2
- Axios for API calls
- React Router for navigation
- SCSS for styling

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- bcryptjs for password hashing
- Express validation
- Helmet for security

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd budget
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Environment Configuration
Create a `.env` file in the backend directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/emi_tracking_app
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
```

### 5. Start MongoDB
Make sure MongoDB is running on your system or update the `MONGODB_URI` in the `.env` file to point to your MongoDB instance.

## Running the Application

### Development Mode (Both Frontend and Backend)
```bash
npm run dev
```

This will start both the React frontend (port 3000) and Node.js backend (port 5000) concurrently.

### Frontend Only
```bash
npm start
```

### Backend Only
```bash
npm run server
```

### Production Build
```bash
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Reports
- `GET /api/reports/dashboard` - Get dashboard data
- `GET /api/reports/spending` - Get spending analysis
- `GET /api/reports/income` - Get income analysis

## Project Structure

```
budget/
├── src/                          # React frontend source
│   ├── components/               # Reusable components
│   ├── views/                    # Page components
│   │   ├── Dashboard.js         # Main dashboard
│   │   ├── Transactions.js      # Transaction management
│   │   ├── Categories.js        # Category management
│   │   ├── EMIs.js              # EMI tracking
│   │   ├── Reports.js           # Financial reports
│   │   ├── Login.js             # Login page
│   │   └── Register.js          # Registration page
│   ├── routes.js                # Application routes
│   └── index.js                 # Main entry point
├── backend/                      # Node.js backend
│   ├── config/                   # Configuration files
│   ├── middleware/               # Custom middleware
│   ├── models/                   # MongoDB models
│   ├── routes/                   # API routes
│   ├── server.js                 # Main server file
│   └── package.json             # Backend dependencies
├── public/                       # Static assets
└── package.json                 # Frontend dependencies
```

## Usage

### 1. First Time Setup
1. Register a new account
2. Set up your preferred currency
3. Add your monthly income (optional)
4. Create categories for your transactions

### 2. Managing Transactions
- Add new income or expense transactions
- Categorize transactions for better organization
- Add notes and payment method information
- Filter and search through your transaction history

### 3. EMI Tracking
- Add new EMI entries with payment schedules
- Track EMI payments and due dates
- Monitor loan progress and completion
- Organize EMIs by categories

### 4. Financial Insights
- View spending patterns and trends
- Analyze income sources
- Generate detailed financial reports
- Export data for external analysis

## Customization

### Adding New Categories
Categories can be customized with:
- Name and type (income, expense, or both)
- Custom colors and icons

### Styling
The application uses SCSS for styling. You can customize:
- Color schemes in `src/assets/scss/black-dashboard-react/custom/_variables.scss`
- Component styles in their respective SCSS files
- Global styles in `src/assets/scss/black-dashboard-react.scss`

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting (can be added)

## Deployment

### Frontend (React)
- Build the application: `npm run build`
- Deploy the `build` folder to your hosting service
- Configure environment variables for production

### Backend (Node.js)
- Set `NODE_ENV=production` in your environment
- Use a process manager like PM2
- Set up a reverse proxy (nginx/Apache)
- Use environment variables for sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

## Acknowledgments

- Built with [Black Dashboard React](https://www.creative-tim.com/product/black-dashboard-react) template
- Icons from [Nucleo Icons](https://nucleoapp.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
