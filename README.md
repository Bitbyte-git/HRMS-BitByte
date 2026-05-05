# Employee Onboarding System — MERN Stack

Production-grade employee onboarding system with role-based access control, multi-step form, document verification, and analytics.

---

## Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS         |
| State    | Zustand + TanStack React Query v5                   |
| Forms    | React Hook Form + Zod                               |
| Backend  | Node.js + Express.js                                |
| Database | MongoDB + Mongoose                                  |
| Auth     | JWT + bcryptjs                                      |
| Files    | Cloudinary + Multer                                 |
| Email    | Nodemailer (SMTP)                                   |
| Security | Helmet + CORS + Rate Limiting + Mongo Sanitize      |

---

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env        # fill in all values
npm install
npm run seed                # creates Super Admin (run once)
npm run dev                 # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set VITE_API_URL
npm run dev                 # http://localhost:5173
```

---

## Roles

| Role        | Access                                                   |
|-------------|----------------------------------------------------------|
| Employee    | Register, fill onboarding form, view profile             |
| Admin       | Verify sections, preview documents, forward to SA        |
| Super Admin | Final approval, generate Employee ID, admin management   |

---

## Employee ID Format
```
EMP-{YEAR}-{SEQUENCE}   →   EMP-2025-0001
```

---

## API Reference

| Method | Endpoint                                         | Role        |
|--------|--------------------------------------------------|-------------|
| POST   | /api/v1/auth/login                               | Public      |
| POST   | /api/v1/auth/register                            | Public      |
| PATCH  | /api/v1/auth/reset-password                      | Any         |
| GET    | /api/v1/auth/me                                  | Any         |
| GET    | /api/v1/employee/profile                         | Employee    |
| GET    | /api/v1/employee/status                          | Employee    |
| POST   | /api/v1/employee/draft/:section                  | Employee    |
| GET    | /api/v1/employee/draft                           | Employee    |
| PUT    | /api/v1/employee/personal                        | Employee    |
| PUT    | /api/v1/employee/education                       | Employee    |
| PUT    | /api/v1/employee/bank                            | Employee    |
| POST   | /api/v1/employee/documents                       | Employee    |
| PATCH  | /api/v1/employee/submit/:section                 | Employee    |
| GET    | /api/v1/admin/me                                 | Admin       |
| GET    | /api/v1/admin/employees                          | Admin       |
| GET    | /api/v1/admin/employees/:id                      | Admin       |
| PATCH  | /api/v1/admin/employees/:id/verify/:section      | Admin       |
| PATCH  | /api/v1/admin/employees/:id/verify-document      | Admin       |
| PATCH  | /api/v1/admin/employees/:id/view-document/:type  | Admin       |
| PATCH  | /api/v1/admin/employees/:id/forward              | Admin       |
| GET    | /api/v1/admin/dashboard                          | Admin       |
| GET    | /api/v1/super-admin/pending                      | Super Admin |
| GET    | /api/v1/super-admin/employees                    | Super Admin |
| GET    | /api/v1/super-admin/employees/:id                | Super Admin |
| PATCH  | /api/v1/super-admin/employees/:id/review         | Super Admin |
| GET    | /api/v1/super-admin/admins                       | Super Admin |
| POST   | /api/v1/super-admin/admins                       | Super Admin |
| PATCH  | /api/v1/super-admin/admins/:id/status            | Super Admin |
| GET    | /api/v1/super-admin/dashboard                    | Super Admin |

---

## Fixes Applied (v2)

- ✅ Admin employee detail now loads properly with documents
- ✅ Document preview: admin must view before approve/reject unlocks
- ✅ Per-document verification (Aadhaar/PAN/Passbook individually)
- ✅ Admin My Profile page added
- ✅ Super Admin "All Employees" page fixed and working
- ✅ Super Admin sees only admin-approved profiles for final review
- ✅ Role bug fixed: new admins now get correct role (not employee)
- ✅ Role dropdown in admin creation modal (Admin / Super Admin)
- ✅ Gender changed to radio buttons (Male / Female / Other)
- ✅ Education level dropdown (UG / PG / Diploma / HSC / SSLC)
- ✅ Aadhaar validation: exactly 12 digits
- ✅ PAN validation: ABCDE1234F format
- ✅ Draft save/restore: form data preserved across steps and page refresh
- ✅ Onboarding form hidden after completion, replaced with status screen
- ✅ Unique Employee ID auto-generated on final approval
- ✅ Soft delete support on all user records

---

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/employee_onboarding
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@company.com
EMAIL_FROM_NAME=HR Onboarding System
FRONTEND_URL=http://localhost:5173
COMPANY_NAME=Your Company Name
SUPER_ADMIN_EMAIL=superadmin@company.com
SUPER_ADMIN_PASSWORD=SuperAdmin@123
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=HR Onboarding Portal
VITE_COMPANY_NAME=Your Company Name
```
# Bit-Byte-HRMS
