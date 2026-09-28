import React from 'react'
import { Navbar } from './shared/Navbar'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'

const AppliedClubsTable = () => {
  return (
    <div>
      <Navbar/>
      <div className="flex justify-center min-h-screen">
  <div className="p-12 w-full max-w-4xl">
    <h1 className="font-bold text-3xl text-center mb-8">Applied Clubs</h1>
    <Table className="w-full my-10">
      <TableCaption >Recently Applied Clubs</TableCaption>
      <TableHeader>
        <TableRow className="flex justify-between px-8">
          <TableHead className="w-1/4">Date</TableHead>
          <TableHead className="w-1/4 text-center">Club Name</TableHead>
          <TableHead className="w-1/4 text-center">Position</TableHead>
          <TableHead className="w-1/4 text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map((item, index) => (
          <TableRow className="flex justify-between px-8" key={index}>
            <TableCell className="w-1/4">date</TableCell>
            <TableCell className="w-1/4 text-center">ACM</TableCell>
            <TableCell className="w-1/4 text-center">Member</TableCell>
            <TableCell className="w-1/4 text-right"><Badge className={"bg-gray-500"}>Selected</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
</div>

    </div>
  )
}

export default AppliedClubsTable