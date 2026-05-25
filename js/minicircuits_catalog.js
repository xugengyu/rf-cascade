window.MiniCircuitsCatalog = {
  Amplifier: [
    {
      model: "ZX60-33LN+",
      description: "Low Noise Amplifier, 50 - 3000 MHz",
      params: {
        Gain_dB: 18.0,
        NF_dB: 1.1,
        P1dB_dBm: 17.5,
        OIP3_dBm: 29.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZX60-33LN+.pdf"
    },
    {
      model: "PHA-1+",
      description: "High Dynamic Range Amplifier, 50 - 6000 MHz",
      params: {
        Gain_dB: 13.5,
        NF_dB: 2.3,
        P1dB_dBm: 22.0,
        OIP3_dBm: 39.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/PHA-1+.pdf"
    },
    {
      model: "ZHL-42+",
      description: "High Power Amplifier, 700 - 4200 MHz",
      params: {
        Gain_dB: 30.0,
        NF_dB: 8.0,
        P1dB_dBm: 29.0,
        OIP3_dBm: 38.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZHL-42.pdf"
    },
    {
      model: "Gali-39+",
      description: "Wideband Monolithic Amplifier, DC - 3000 MHz",
      params: {
        Gain_dB: 20.0,
        NF_dB: 2.4,
        P1dB_dBm: 12.6,
        OIP3_dBm: 25.8
      },
      datasheet: "https://www.minicircuits.com/pdfs/GALI-39+.pdf"
    }
  ],
  Attenuator: [
    {
      model: "VAT-3+",
      description: "Coaxial Fixed Attenuator, DC - 6000 MHz",
      params: {
        Loss_dB: 3.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/VAT-3+.pdf"
    },
    {
      model: "VAT-10+",
      description: "Coaxial Fixed Attenuator, DC - 6000 MHz",
      params: {
        Loss_dB: 10.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/VAT-10+.pdf"
    },
    {
      model: "VAT-20+",
      description: "Coaxial Fixed Attenuator, DC - 6000 MHz",
      params: {
        Loss_dB: 20.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/VAT-20+.pdf"
    },
    {
      model: "UNAT-6+",
      description: "Coaxial Fixed Attenuator, DC - 6000 MHz",
      params: {
        Loss_dB: 6.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/UNAT-6+.pdf"
    }
  ],
  Mixer: [
    {
      model: "ADE-1+",
      description: "Frequency Mixer, 0.5 - 500 MHz, LO Level +7dBm",
      params: {
        Type: "Downconvertor",
        Conversion_Gain_dB: -5.0,
        NF_dB: 5.0,
        LO_Power_dBm: 7.0,
        LO_Frequency_MHz: 100.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/ADE-1.pdf"
    },
    {
      model: "ZX05-1+",
      description: "Frequency Mixer, 0.5 - 500 MHz, LO Level +7dBm",
      params: {
        Type: "Downconvertor",
        Conversion_Gain_dB: -6.0,
        NF_dB: 6.0,
        LO_Power_dBm: 7.0,
        LO_Frequency_MHz: 100.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZX05-1.pdf"
    },
    {
      model: "SAY-1+",
      description: "High IP3 Frequency Mixer, 0.1 - 500 MHz, LO Level +23dBm",
      params: {
        Type: "Downconvertor",
        Conversion_Gain_dB: -6.0,
        NF_dB: 6.0,
        LO_Power_dBm: 23.0,
        LO_Frequency_MHz: 100.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/SAY-1.pdf"
    }
  ],
  Filter: [
    {
      model: "VLF-800+",
      description: "Coaxial Low Pass Filter, DC - 800 MHz",
      params: {
        Type: "Lowpass",
        Passband_Start_MHz: 0.0,
        Passband_End_MHz: 800.0,
        Loss_dB: 1.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/VLF-800+.pdf"
    },
    {
      model: "VHF-1200+",
      description: "Coaxial High Pass Filter, 1300 - 6000 MHz",
      params: {
        Type: "Highpass",
        Passband_Start_MHz: 1300.0,
        Passband_End_MHz: 6000.0,
        Loss_dB: 1.0
      },
      datasheet: "https://www.minicircuits.com/pdfs/VHF-1200+.pdf"
    },
    {
      model: "CBP-2400C+",
      description: "Coaxial Band Pass Filter, 2300 - 2500 MHz",
      params: {
        Type: "Bandpass",
        Passband_Start_MHz: 2300.0,
        Passband_End_MHz: 2500.0,
        Loss_dB: 2.5
      },
      datasheet: "https://www.minicircuits.com/pdfs/CBP-2400C+.pdf"
    }
  ],
  Splitter: [
    {
      model: "ZFSC-2-1+",
      description: "2-Way 0° Power Splitter, 5 - 500 MHz",
      params: {
        Loss_dB: 3.3,
        Number_of_Outputs: 2
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZFSC-2-1.pdf"
    },
    {
      model: "ZAPD-2+",
      description: "2-Way 0° Power Splitter, 1000 - 2000 MHz",
      params: {
        Loss_dB: 3.4,
        Number_of_Outputs: 2
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZAPD-2.pdf"
    }
  ],
  Combiner: [
    {
      model: "ZFSC-2-1+",
      description: "2-Way 0° Power Combiner, 5 - 500 MHz",
      params: {
        Loss_dB: 3.3,
        Number_of_Inputs: 2
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZFSC-2-1.pdf"
    },
    {
      model: "ZAPD-2+",
      description: "2-Way 0° Power Combiner, 1000 - 2000 MHz",
      params: {
        Loss_dB: 3.4,
        Number_of_Inputs: 2
      },
      datasheet: "https://www.minicircuits.com/pdfs/ZAPD-2.pdf"
    }
  ]
};
