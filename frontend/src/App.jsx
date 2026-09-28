import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Navbar } from './components/shared/Navbar'
import Home from './components/Home'
import Login from './components/auth/Login'
import Signup from './components/auth/Signup'
import Clubs from './components/Clubs'
import Profile from './components/Profile'
import AppliedJobTable from './components/AppliedClubsTable'
import AppliedClubsTable from './components/AppliedClubsTable'
import ClubDescription from './components/ClubDescription'
import Companies from './components/admin/Companies'
import CompanyCreate from './components/admin/CompanyCreate'
import CompanySetup from './components/admin/CompanySetup'

const appRouter = createBrowserRouter([
  {
    path:"/",
  element:<Home/>
},
{
  path:"/login",
  element:<Login/>
},
{
  path:"/signup",
  element:<Signup/>
},
{
  path:"/clubs",
  element:<Clubs/>
},
{
  path:"/appliedclubs",
  element:<AppliedClubsTable/>
},
{
  path:"/profile",
  element:<Profile/>
},
{
  path:"/description/:id",
  element:<ClubDescription/>
},
//ADMIN
{
  path:"admin/companies",
  element:<Companies></Companies>
},
{
  path:"admin/companies/create",
  element:<CompanyCreate></CompanyCreate>
},
{
  path:"admin/companies/:id",
  element:<CompanySetup/>
}

])

function App() {
  return (
    <>
      <RouterProvider router={appRouter}/>
    </>
  )
}

export default App
