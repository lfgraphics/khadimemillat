import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Users } from "lucide-react"
import { getDynamicIcon } from "@/lib/iconUtils"
import { getWelfarePrograms } from "@/server/welfare-programs"
import { AnimatedSection } from '@/components/animations'
import { Button } from '@/components/ui/button'
import ShareProgramButton from '@/components/ShareProgramButton'

export const metadata: Metadata = {
  title: "Welfare Programs | Khadim-Millat Welfare Foundation",
  description: "Explore our comprehensive welfare programs supporting education, healthcare, emergency relief, and community development initiatives."
}

export default async function WelfareProgramsPage() {
  const programs = await getWelfarePrograms(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Our Welfare Programs
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
              Comprehensive initiatives addressing community needs through sustainable funding and dedicated volunteer efforts
            </p>
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {programs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {programs.map((program, index) => {
                const IconComponent = getDynamicIcon(program.icon)

                return (
                  <AnimatedSection key={program._id} variant="slideUp" delay={0.1 + index * 0.08} className="h-full">
                    <div className="rounded-lg overflow-hidden shadow-sm hoact:shadow-md transition-shadow h-full flex flex-col group bg-card">
                      <Link href={`/welfare-programs/${program.slug}`} className="block flex-1">
                        <div className="relative h-48 w-full">
                          {program.coverImage ? (
                            <Image
                              src={program.coverImage}
                              alt={program.title}
                              fill
                              className="object-cover group-hoact:scale-110 transition-transform duration-700"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${program.iconColor}20` }}>
                              <IconComponent className="h-16 w-16" style={{ color: program.iconColor }} />
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: `${program.iconColor}20` }}>
                              <IconComponent className="h-5 w-5" style={{ color: program.iconColor }} />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">{program.title}</h3>
                          </div>

                          <div className="text-muted-foreground mb-4">
                            <p className="text-sm line-clamp-3">{program.description}</p>
                          </div>

                          <div className="flex items-center justify-between text-sm text-primary">
                            <div className="flex items-center">
                              <IconComponent className="mr-2 h-4 w-4" />
                              <span>{program.totalSupporters} supporters</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">₹{program.totalRaised.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">{program.totalCampaigns} campaigns</div>
                            </div>
                          </div>
                        </div>
                      </Link>

                      <div className="p-6 pt-0">
                        <div className="flex gap-2">
                          <Link className='flex-1 w-full' href={`/campaigns?program=${encodeURIComponent(program.slug)}`}>
                            <Button variant="secondary" className="w-full">
                              Donate Now
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                          <ShareProgramButton slug={program.slug} title={program.title} />
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Programs Available</h3>
              <p className="text-muted-foreground">
                We're working on launching new welfare programs. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}