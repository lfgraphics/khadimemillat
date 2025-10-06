import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Users } from "lucide-react"
import { getDynamicIcon } from "@/lib/iconUtils"
import { getWelfarePrograms } from "@/server/welfare-programs"

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
              {programs.map((program) => {
                const IconComponent = getDynamicIcon(program.icon)

                return (
                  <div key={program._id} className="group">
                    <Link href={`/welfare-programs/${program.slug}`} className="block">
                      <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                        {/* Cover Image */}
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={program.coverImage}
                            alt={program.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div
                            className="absolute top-4 left-4 w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${program.iconColor}20`, backdropFilter: 'blur(10px)' }}
                          >
                            <IconComponent
                              className="h-6 w-6"
                              style={{ color: program.iconColor }}
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                            {program.title}
                          </h3>
                          <p className="text-muted-foreground mb-4 line-clamp-3">
                            {program.description}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                            <div>
                              <div className="font-semibold text-foreground">₹{(program.totalRaised / 1000).toFixed(0)}K</div>
                              <div className="text-xs text-muted-foreground">Raised</div>
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{program.totalCampaigns}</div>
                              <div className="text-xs text-muted-foreground">Campaigns</div>
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{program.totalSupporters}</div>
                              <div className="text-xs text-muted-foreground">Supporters</div>
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-primary font-medium">View Campaigns</span>
                            <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
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