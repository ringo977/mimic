import { Metadata } from 'next';
import Card from '@/components/ui/Card';
import { MapPin, Mail, Phone, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact | Organ-on-Chip Lab',
  description: 'Get in touch with the Organ-on-Chip Lab at Politecnico di Milano.',
};

export default function ContactPage() {
  return (
    <div className="relative z-10 pt-32 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Get in touch with our team for collaborations, inquiries, or visit opportunities.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Details */}
            <div>
              <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8">
                Get In Touch
              </h2>

              <div className="space-y-6">
                <Card>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-polimi-bright-blue" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                        Address
                      </h3>
                      <p className="text-gray-700">
                        Department of Electronics, Information<br />
                        and Bioengineering (DEIB)<br />
                        Politecnico di Milano<br />
                        Via Ponzio 34/5<br />
                        20133 Milano, Italy
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="text-polimi-bright-blue" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                        Email
                      </h3>
                      <p className="text-gray-700">
                        General inquiries:<br />
                        <a href="mailto:info@organchip.polimi.it" className="text-polimi-bright-blue hover:text-polimi-alpha-blue">
                          info@organchip.polimi.it
                        </a>
                      </p>
                      <p className="text-gray-700 mt-2">
                        Career opportunities:<br />
                        <a href="mailto:careers@organchip.polimi.it" className="text-polimi-bright-blue hover:text-polimi-alpha-blue">
                          careers@organchip.polimi.it
                        </a>
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="text-polimi-bright-blue" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                        Phone
                      </h3>
                      <p className="text-gray-700">
                        +39 02 2399 xxxx
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="text-polimi-bright-blue" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                        Office Hours
                      </h3>
                      <p className="text-gray-700">
                        Monday - Friday: 9:00 AM - 6:00 PM<br />
                        Saturday - Sunday: Closed
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8">
                Send Us a Message
              </h2>

              <Card>
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                      placeholder="What is this regarding?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all resize-none"
                      placeholder="Your message..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-polimi-bright-blue hover:bg-polimi-alpha-blue text-white px-6 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Send Message
                  </button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
            Find Us
          </h2>
          
          <div className="w-full h-96 bg-polimi-gray rounded-xl overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2798.2476913984845!2d9.229909215794556!3d45.47855597910111!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c6dec456e6c1%3A0x61c9a5a817c3c6b0!2sPolitecnico%20di%20Milano!5e0!3m2!1sen!2sit!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Politecnico di Milano Location"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
