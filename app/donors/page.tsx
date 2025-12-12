import { Metadata } from 'next'
import { getUniqueDonors } from '@/server/donors'
import { Users, Calendar, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Our Donors | Khadim-e-Millat Welfare Foundation',
  description: 'See the generous individuals supporting our programs.'
}

type Donor = {
  id: string
  name: string
  email?: string
  lastDonationAt: string
  totalAmount: number
  donationsCount: number
}

function Pagination({ currentPage, totalPages }: { currentPage: number, totalPages: number }) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {currentPage > 1 && (
        <Link href={`/donors?page=${currentPage - 1}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        </Link>
      )}
      
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 5) {
            pageNum = i + 1
          } else if (currentPage <= 3) {
            pageNum = i + 1
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i
          } else {
            pageNum = currentPage - 2 + i
          }
          
          return (
            <Link key={pageNum} href={`/donors?page=${pageNum}`}>
              <Button 
                variant={pageNum === currentPage ? "default" : "outline"} 
                size="sm"
                className="w-10 h-10"
              >
                {pageNum}
              </Button>
            </Link>
          )
        })}
      </div>

      {currentPage < totalPages && (
        <Link href={`/donors?page=${currentPage + 1}`}>
          <Button variant="outline" size="sm">
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  )
}

export default async function DonorsPage({ searchParams }: { searchParams: { page?: string } }) {
  const currentPage = parseInt((await searchParams).page || '1')
  const { donors, total, pages } = await getUniqueDonors(currentPage, 20)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Our Generous Donors</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total} unique donors • Page {currentPage} of {pages}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">Latest first</div>
      </div>

      {donors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No donations recorded yet.</div>
      ) : (
        <>
          <div className="space-y-3">
            {donors.map((d) => (
              <div key={d.id} className="flex flex-wrap items-baseline justify-between p-4 rounded-lg bg-card border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{d.name}</div>
                    {d.email && <div className="text-xs text-muted-foreground">{d.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {d.donationsCount} donation{d.donationsCount > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {new Date(d.lastDonationAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Pagination currentPage={currentPage} totalPages={pages} />
        </>
      )}
    </div>
  )
}
