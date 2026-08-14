import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    // There's no backend endpoint to receive this message, so rather than
    // faking a "Message sent!" success, this opens the user's own email
    // client with the message pre-filled — honest about what actually happens.
    const handleSubmit = (e) => {
        e.preventDefault();
        const subject = encodeURIComponent(`Message from ${name}`);
        const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
        window.location.href = `mailto:hello@akio.com?subject=${subject}&body=${body}`;
        toast("Opening your email app to send this...", { duration: 4000 });
    };

    return (
        <div className="min-h-screen bg-cream">
            <div className="bg-primary py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-bold text-white">Contact Us</h1>
                    <p className="text-white/70 mt-2">We'd love to hear from you</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div>
                        <h2 className="text-2xl font-bold text-charcoal mb-6">Get in Touch</h2>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary p-3 rounded-xl">
                                    <MapPin size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-charcoal">Address</h3>
                                    <p className="text-charcoal/60 mt-1">123 Food Street, New Delhi, India</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary p-3 rounded-xl">
                                    <Phone size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-charcoal">Phone</h3>
                                    <p className="text-charcoal/60 mt-1">+91 98765 43210</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary p-3 rounded-xl">
                                    <Mail size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-charcoal">Email</h3>
                                    <p className="text-charcoal/60 mt-1">hello@akio.com</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-primary p-3 rounded-xl">
                                    <Clock size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-charcoal">Opening Hours</h3>
                                    <p className="text-charcoal/60 mt-1">Mon-Fri: 10am - 10pm</p>
                                    <p className="text-charcoal/60">Sat-Sun: 9am - 11pm</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-2xl shadow-md p-8">
                        <h2 className="text-xl font-semibold text-charcoal mb-6">Send us a Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="contact-name" className="block text-sm font-medium text-charcoal mb-1">Name</label>
                                <input
                                    id="contact-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label htmlFor="contact-email" className="block text-sm font-medium text-charcoal mb-1">Email</label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="block text-sm font-medium text-charcoal mb-1">Message</label>
                                <textarea
                                    id="contact-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                    placeholder="How can we help you?"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                <Send size={16} /> Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
