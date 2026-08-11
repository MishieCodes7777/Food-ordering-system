import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="bg-charcoal text-white">
            {/* Contact Section */}
            <div className="bg-cream-dark py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-charcoal text-center mb-8">Contact Us</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex items-start gap-3">
                            <div className="bg-accent p-2 rounded-lg">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal">Address</h3>
                                <p className="text-charcoal/70 text-sm">123 Food Street, New Delhi, India</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-accent p-2 rounded-lg">
                                <Phone size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal">Phone</h3>
                                <p className="text-charcoal/70 text-sm">+91 98765 43210</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-accent p-2 rounded-lg">
                                <Phone size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal">Legal</h3>
                                <Link to="/terms" className="text-charcoal/70 text-sm hover:text-accent transition-colors block">Terms & Conditions</Link>
                                <Link to="/cookie-policy" className="text-charcoal/70 text-sm hover:text-accent transition-colors block">Cookie Policy</Link>
                                <Link to="/privacy" className="text-charcoal/70 text-sm hover:text-accent transition-colors block">Privacy Policy</Link>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-accent p-2 rounded-lg">
                                <Phone size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal">Phone</h3>
                                <p className="text-charcoal/70 text-sm">+91 98765 43210</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-accent p-2 rounded-lg">
                                <Clock size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-charcoal">Opening Hours</h3>
                                <p className="text-charcoal/70 text-sm">Mon-Fri: 10am - 10pm</p>
                                <p className="text-charcoal/70 text-sm">Sat-Sun: 9am - 11pm</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                                Aki<span className="text-accent">o</span>
                            </span>
                            <span className="text-white/60 text-sm">— Elevating dining with passion and flavor.</span>
                        </div>
                        <p className="text-white/50 text-sm">
                            © {new Date().getFullYear()} Akio. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
