import Link from 'next/link';
import { Mail, MapPin, Phone, Linkedin, Twitter } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-polimi-blue-heritage text-white relative z-10">
      <div className="container-polimi py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* About Section */}
          <div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4">
              <span className="text-polimi-blue-heritage font-frank font-bold text-xl">P</span>
            </div>
            <h3 className="font-frank font-bold text-xl mb-4">MiMic Lab</h3>
            <p className="text-polimi-gray text-sm leading-relaxed">
              Advanced microfluidic systems and MiMic research at the Department of Electronics, 
              Information and Bioengineering (DEIB).
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-frank font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/team" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors text-sm">Team</Link></li>
              <li><Link href="/research" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors text-sm">Research</Link></li>
              <li><Link href="/publications" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors text-sm">Publications</Link></li>
              <li><Link href="/news" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors text-sm">News</Link></li>
              <li><Link href="/join" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors text-sm">Join Us</Link></li>
            </ul>
          </div>

          {/* Research Areas */}
          <div>
            <h4 className="font-frank font-bold text-lg mb-4">Research Areas</h4>
            <ul className="space-y-2">
              <li className="text-polimi-gray text-sm">Microfluidics</li>
              <li className="text-polimi-gray text-sm">Organ-on-Chip Systems</li>
              <li className="text-polimi-gray text-sm">Biosensors</li>
              <li className="text-polimi-gray text-sm">Lab-on-Chip Devices</li>
              <li className="text-polimi-gray text-sm">Biomedical Engineering</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-frank font-bold text-lg mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2 text-polimi-gray text-sm">
                <MapPin size={18} className="flex-shrink-0 mt-0.5" />
                <span>
                  DEIB - Politecnico di Milano<br />
                  Via Ponzio 34/5<br />
                  20133 Milano, Italy
                </span>
              </li>
              <li className="flex items-center space-x-2 text-polimi-gray text-sm">
                <Mail size={18} className="flex-shrink-0" />
                <a href="mailto:info@organchip.polimi.it" className="hover:text-polimi-bright-blue transition-colors">
                  info@organchip.polimi.it
                </a>
              </li>
              <li className="flex items-center space-x-2 text-polimi-gray text-sm">
                <Phone size={18} className="flex-shrink-0" />
                <span>+39 02 2399 xxxx</span>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex items-center space-x-4 mt-6">
              <a href="#" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-polimi-gray text-sm">
            © {currentYear} MiMic Lab, Politecnico di Milano. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-sm">
            <Link href="/privacy" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-polimi-gray hover:text-polimi-bright-blue transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
