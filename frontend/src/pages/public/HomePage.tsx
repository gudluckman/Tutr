import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/ui/Icon';

export function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-accent/40 to-background px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Tutr helps independent tutors get found and run the week.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Create a public tutor profile, manage enquiries, track students and lessons, and monitor your income all in one simple platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link className="button gap-2 px-6 py-3 text-base" to="/register">
              Create tutor profile
              <Icon name="arrowRight" className="h-5 w-5" />
            </Link>
            <Link className="button-secondary px-6 py-3 text-base" to="/tutors">Browse tutors</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-semibold text-foreground">
            Everything you need to run your tutoring business
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon="user" title="Public profile" description="Create a professional profile that parents and students can discover and view online." />
            <FeatureCard icon="mail" title="Enquiry inbox" description="Receive and manage enquiries from potential students in one central place." />
            <FeatureCard icon="users" title="Students & lessons" description="Keep track of students, schedule lessons, and monitor attendance and payment status." />
            <FeatureCard icon="dollar" title="Income summary" description="View monthly revenue, unpaid amounts, and track tutoring income over time." />
          </div>
        </div>
      </section>

      <section className="bg-accent/30 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-semibold text-foreground">Ready to get started?</h2>
          <p className="mb-8 text-lg text-muted-foreground">Join tutors across Australia who use Tutr to grow their business.</p>
          <Link className="button gap-2 px-6 py-3 text-base" to="/register">
            Create your free profile
            <Icon name="arrowRight" className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
      <Icon name={icon} className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
