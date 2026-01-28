'use client';

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/mimic/images/home/wafer-electrodes.jpg)`,
        }}
      />

      {/* Dark overlay for better text contrast on top */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 40%, rgba(0, 0, 0, 0) 60%)',
        }}
      />

      {/* White gradient overlay: transparent top → white bottom */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.7) 70%, rgba(255, 255, 255, 1) 100%)',
        }}
      />

      <div className="container-polimi relative z-10 text-center pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="font-frank font-bold text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg">
            MiMic<br />
            <span className="text-polimi-bright-blue">Innovation Lab</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto mb-8 leading-relaxed font-light drop-shadow-md">
            Advancing microfluidic technologies and MiMic systems for the future of biomedical research 
            at Politecnico di Milano
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a 
              href="/research" 
              className="bg-polimi-bright-blue hover:bg-polimi-alpha-blue text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Explore Our Research
            </a>
            <a 
              href="/join" 
              className="border-2 border-white hover:bg-white hover:text-polimi-blue-heritage text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300"
            >
              Join Our Team
            </a>
          </div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="text-center">
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">15+</div>
              <div className="text-sm text-gray-600">Research Projects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">50+</div>
              <div className="text-sm text-gray-600">Publications</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">20+</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">10+</div>
              <div className="text-sm text-gray-600">International Partners</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ArrowDown className="text-polimi-bright-blue" size={32} />
        </motion.div>
      </div>
    </section>
  );
}
