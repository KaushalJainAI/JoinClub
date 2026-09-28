import React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Avatar, AvatarImage } from '@radix-ui/react-avatar'
import { Edit2, MoreHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover'

const CompaniesTable = () => {
  return (
    <div>
        <Table>
            <TableCaption>List of Recent Applied Clubs </TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Logo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableCell>
                        <Avatar>
                            <AvatarImage src="https://images.app.goo.gl/nhMsxKXCyAAFNUm98">Club Logo</AvatarImage>
                        </Avatar>
                    </TableCell>
                    <TableCell>Club Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell className="text-right">
                        <Popover>
                            <PopoverTrigger><MoreHorizontal></MoreHorizontal></PopoverTrigger>
                            <PopoverContent className="w-15">
                                <div>
                                    <Edit2></Edit2>
                                    <span>Edit</span>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </TableCell>

                </TableBody>
            
        </Table>
    </div>
  )
}

export default CompaniesTable