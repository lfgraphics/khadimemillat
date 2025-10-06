import Link from "next/link"
import { AnimatedSection } from '@/components/animations'
import { getDynamicIcon } from '@/lib/iconUtils'
import { getWelfarePrograms } from '@/server/welfare-programs'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { Button } from '@/components/ui/button'

export default async function WelfareProgramsSection() {
  const programs = await getWelfarePrograms(true)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection
        variant="fade"
        delay={0.1}
        duration={0.5}
        threshold={0.2}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="programs-title">
            Our Welfare Programs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="programs-description">
            Supporting communities through various initiatives funded by our sustainable scrap collection operations
          </p>
        </div>
      </AnimatedSection>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {programs.map((program, index) => {
          const IconComponent = getDynamicIcon(program.icon)

          return (
            <AnimatedSection
              key={program._id}
              variant="slideUp"
              delay={0.2 + (index * 0.15)}
              duration={0.5}
              threshold={0.2}
              className="h-full"
            >
              <div className="bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col" data-testid={`program-${program.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <Link href={`/welfare-programs/${program.slug}`} className="block flex-1">
                  <div>
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${program.iconColor}20` }}
                    >
                      <IconComponent
                        className="h-8 w-8"
                        style={{ color: program.iconColor }}
                      />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-foreground">{program.title}</h3>
                    <div className="text-muted-foreground mb-4">
                      <MarkdownRenderer 
                        content={program.description} 
                        className="text-sm line-clamp-3"
                      />
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
                <div className="mt-4">
                  <Button asChild className="w-full" variant="secondary" data-testid={`donate-${program.slug}`}>
                    <Link href={`/donate?program=${encodeURIComponent(program.slug)}`}>
                      Donate to this cause
                    </Link>
                  </Button>
                </div>
              </div>
            </AnimatedSection>
          )
        })}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No welfare programs available at the moment.</p>
        </div>
      )}
    </div>
  )
}