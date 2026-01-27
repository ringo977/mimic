import Hero from '@/components/Hero';
import ResearchCard from '@/components/ResearchCard';
import NewsCard from '@/components/NewsCard';
import Button from '@/components/ui/Button';

// Mock data - will be replaced with actual data from JSON files
const researchAreas = [
  {
    id: 1,
    title: 'Microfluidic Systems',
    description: 'Design and fabrication of advanced microfluidic platforms for organ-on-chip applications, enabling precise control of cellular microenvironments.',
    tags: ['Microfluidics', 'Lab-on-Chip', 'PDMS'],
    image: '/images/research/microfluidics.jpg'
  },
  {
    id: 2,
    title: 'Organ-on-Chip Models',
    description: 'Development of physiologically relevant organ models including heart, lung, liver, and gut-on-chip systems for drug testing and disease modeling.',
    tags: ['Organ Models', 'Tissue Engineering', '3D Culture'],
    image: '/images/research/organ-models.jpg'
  },
  {
    id: 3,
    title: 'Biosensing Technologies',
    description: 'Integration of advanced biosensors for real-time monitoring of cellular behavior, metabolic activity, and tissue responses in microfluidic devices.',
    tags: ['Biosensors', 'Real-time Monitoring', 'Electrochemistry'],
    image: '/images/research/biosensors.jpg'
  }
];

const latestNews = [
  {
    id: 1,
    date: '2024-01-15',
    title: 'New Publication in Lab on a Chip',
    excerpt: 'Our latest research on advanced microfluidic systems for cardiac tissue modeling has been published in Lab on a Chip journal.',
    tag: 'News' as const,
    image: '/images/news/publication.jpg'
  },
  {
    id: 2,
    date: '2024-01-10',
    title: 'Team Member Wins Best Poster Award',
    excerpt: 'Congratulations to Dr. Maria Bianchi for winning the Best Poster Award at the International Conference on Organ-on-Chip Technology.',
    tag: 'Award' as const
  },
  {
    id: 3,
    date: '2024-01-05',
    title: 'Upcoming Workshop on Microfluidics',
    excerpt: 'Join us for a hands-on workshop on microfluidic device fabrication and characterization. Registration now open.',
    tag: 'Event' as const
  }
];

export default function HomePage() {
  return (
    <div className="relative z-10">
      {/* Hero Section */}
      <Hero />

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-6">
              About Our Lab
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              The Organ-on-Chip Lab at the Department of Electronics, Information and Bioengineering (DEIB) 
              of Politecnico di Milano focuses on developing cutting-edge microfluidic technologies and 
              organ-on-chip systems.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our interdisciplinary team combines expertise in bioengineering, microfabrication, and cell biology 
              to create innovative platforms for drug discovery, disease modeling, and personalized medicine.
            </p>
          </div>
        </div>
      </section>

      {/* Research Areas */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="text-center mb-12">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-4">
              Research Areas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our main research focus areas and ongoing projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {researchAreas.map((area) => (
              <ResearchCard
                key={area.id}
                title={area.title}
                description={area.description}
                tags={area.tags}
                image={area.image}
                link="/research"
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button href="/research" variant="primary">
              View All Research Projects
            </Button>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="text-center mb-12">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-4">
              Latest News
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stay updated with our latest achievements and upcoming events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestNews.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button href="/news" variant="secondary">
              View All News
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white">
        <div className="container-polimi text-center">
          <h2 className="font-frank font-bold text-4xl md:text-5xl mb-6">
            Join Our Team
          </h2>
          <p className="text-xl text-polimi-gray mb-8 max-w-2xl mx-auto">
            We are always looking for talented and motivated researchers to join our lab. 
            Explore current opportunities in PhD positions, postdoctoral research, and thesis projects.
          </p>
          <Button href="/join" variant="primary">
            View Open Positions
          </Button>
        </div>
      </section>
    </div>
  );
}
