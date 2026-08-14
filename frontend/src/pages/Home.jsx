import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowRight, Users, Star, ChefHat, Leaf, Clock, Sparkles } from "lucide-react";
import SplitText from "../components/SplitText.jsx";
import Counter from "../components/Counter.jsx";
import Onboarding from "../components/Onboarding.jsx";
import api from "../services/api.js";
import { getHomeStats, getPublicReviews } from "../services/reviewService.js";

const Home = () => {
    const [featuredItems, setFeaturedItems] = useState([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [stats, setStats] = useState(null);
    const [testimonials, setTestimonials] = useState([]);

    useEffect(() => {
        // Check if onboarding should show
        if (localStorage.getItem('akio_show_onboarding') === 'true') {
            setShowOnboarding(true);
        }

        const fetchFeatured = async () => {
            try {
                const res = await api.get("/api/menu/featured");
                setFeaturedItems(res.data.featured_items || []);
            } catch { }
        };
        fetchFeatured();

        const fetchStats = async () => {
            try {
                const data = await getHomeStats();
                setStats(data);
            } catch { }
        };
        fetchStats();

        const fetchTestimonials = async () => {
            try {
                const data = await getPublicReviews(6);
                setTestimonials(data.reviews || []);
            } catch { }
        };
        fetchTestimonials();
    }, []);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        localStorage.removeItem('akio_show_onboarding');
    };

    return (
        <div className="bg-cream">
            {/* Onboarding for new users */}
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
            {/* Hero Section */}
            <section className="bg-primary relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                                <SplitText
                                    text="Experience Fine"
                                    tag="span"
                                    className="text-4xl md:text-6xl font-bold text-white block"
                                    delay={40}
                                    duration={0.6}
                                    ease="power3.out"
                                    splitType="chars"
                                    from={{ opacity: 0, y: 50 }}
                                    to={{ opacity: 1, y: 0 }}
                                    threshold={0.1}
                                    rootMargin="-50px"
                                    textAlign="left"
                                />
                                <SplitText
                                    text="Dining Like Never Before"
                                    tag="span"
                                    className="text-4xl md:text-6xl font-bold text-accent block"
                                    delay={40}
                                    duration={0.6}
                                    ease="power3.out"
                                    splitType="chars"
                                    from={{ opacity: 0, y: 50 }}
                                    to={{ opacity: 1, y: 0 }}
                                    threshold={0.1}
                                    rootMargin="-50px"
                                    textAlign="left"
                                />
                            </h1>
                            <p className="text-white/70 mt-6 text-lg">
                                Fresh ingredients, unforgettable taste, premium ambiance. Order your favorite meals with just a few clicks.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link
                                    to="/menu"
                                    className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all"
                                >
                                    Explore Menu <ArrowRight size={18} />
                                </Link>
                                <Link
                                    to="/register"
                                    className="border-2 border-white text-white hover:bg-white hover:text-primary px-6 py-3 rounded-full font-medium transition-all"
                                >
                                    Join Us
                                </Link>
                            </div>
                            {/* Stats — real data, hidden entirely if the admin turns it off */}
                            {stats?.show_stats && (
                                <div className="mt-12 flex gap-8">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-accent-light border-2 border-primary flex items-center justify-center">
                                                <Users size={14} className="text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">
                                              <Counter value={stats.customer_count} fontSize={18} textColor="white" fontWeight={700} prefix="" />+
                                            </p>
                                            <p className="text-white/60 text-xs">Happy Guests</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Star size={20} className="text-accent fill-accent" />
                                        <div>
                                            <p className="text-white font-bold text-lg">
                                              {stats.review_count > 0 ? (
                                                  <Counter value={stats.average_rating} fontSize={18} textColor="white" fontWeight={700} places={[1, '.', 0.1]} />
                                              ) : (
                                                  "New"
                                              )}
                                            </p>
                                            <p className="text-white/60 text-xs">Rating</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hidden md:flex justify-center">
                            <div className="w-80 h-80 rounded-full bg-primary-light flex items-center justify-center border-4 border-accent/30">
                                <div className="text-center">
                                    <ChefHat size={80} className="text-accent mx-auto" />
                                    <p className="text-white/80 mt-4 text-sm">Premium Quality</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Decorative wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" className="w-full h-auto fill-cream">
                        <path d="M0,40 C360,80 720,0 1440,40 L1440,60 L0,60 Z" />
                    </svg>
                </div>
            </section>

            {/* Popular Menu Section */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-medium">
                            Popular Menu
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold text-charcoal mt-4">
                            <SplitText
                                text="Discover our chef's most loved and trending dishes."
                                tag="span"
                                className="text-3xl md:text-4xl font-bold text-charcoal"
                                delay={30}
                                duration={0.5}
                                ease="power2.out"
                                splitType="words"
                                from={{ opacity: 0, y: 30 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.2}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {featuredItems.length > 0 ? (
                            featuredItems.slice(0, 4).map((item, index) => (
                                <Link
                                    to="/menu"
                                    key={item.id}
                                    className={`rounded-2xl p-6 text-center transition-all hover:scale-105 cursor-pointer ${index === 1 ? "bg-primary text-white" : "bg-white shadow-md"}`}
                                >
                                    <div className="h-16 flex items-center justify-center mb-4">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="h-16 w-16 object-cover rounded-full" />
                                        ) : (
                                            <span className="text-5xl">🍽️</span>
                                        )}
                                    </div>
                                    <p className={`font-medium text-sm ${index === 1 ? "text-white" : "text-charcoal"}`}>
                                        {item.name}
                                    </p>
                                    <p className={`text-xs mt-1 ${index === 1 ? "text-white/60" : "text-accent font-semibold"}`}>
                                        ₹{item.discount_price || item.price}
                                    </p>
                                </Link>
                            ))
                        ) : (
                            [{name: "Truffle Mushroom Pizza", icon: "🍕"}, {name: "Classic Cheese Burger", icon: "🍔"}, {name: "Sushi Deluxe Platter", icon: "🍣"}, {name: "Creamy Alfredo Pasta", icon: "🍝"}].map((item, index) => (
                                <div
                                    key={index}
                                    className={`rounded-2xl p-6 text-center transition-all hover:scale-105 cursor-pointer ${index === 1 ? "bg-primary text-white" : "bg-white shadow-md"}`}
                                >
                                    <div className="text-5xl mb-4">{item.icon}</div>
                                    <p className={`font-medium text-sm ${index === 1 ? "text-white" : "text-charcoal"}`}>{item.name}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="text-center mt-8">
                        <Link
                            to="/menu"
                            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-full font-medium transition-all"
                        >
                            Explore Full Menu <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="bg-charcoal py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">
                        <SplitText
                            text="Why With Us?"
                            tag="span"
                            className="text-3xl font-bold text-white"
                            delay={60}
                            duration={0.5}
                            ease="power3.out"
                            splitType="chars"
                            from={{ opacity: 0, y: 30 }}
                            to={{ opacity: 1, y: 0 }}
                            threshold={0.2}
                            rootMargin="-50px"
                            textAlign="center"
                        />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { icon: <Leaf size={28} />, title: "Fresh Ingredients", desc: "Locally sourced, organic produce" },
                            { icon: <ChefHat size={28} />, title: "Master Chefs", desc: "Expert culinary artists" },
                            { icon: <Sparkles size={28} />, title: "Premium Atmosphere", desc: "Elegant dining experience" },
                            { icon: <Clock size={28} />, title: "Fast & Friendly", desc: "Quick service, warm smiles" },
                        ].map((item, index) => (
                            <div key={index} className="bg-charcoal-light rounded-xl p-6 text-center hover:bg-primary transition-all">
                                <div className="text-accent flex justify-center mb-4">{item.icon}</div>
                                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                                <p className="text-white/60 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reserve Table CTA */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-primary rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white">Reserve Your Table Today</h2>
                            <p className="text-white/70 mt-2">
                                Book your spot and enjoy a fine dining experience with us.
                            </p>
                        </div>
                        <Link
                            to="/menu"
                            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-full font-medium flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            Order Now <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonials — real customer reviews only, never fabricated. Hidden until someone leaves one. */}
            {testimonials.length > 0 && (
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold text-charcoal text-center mb-12">
                            <SplitText
                                text="WHAT PEOPLE ARE SAYING..."
                                tag="span"
                                className="text-3xl font-bold text-charcoal"
                                delay={40}
                                duration={0.5}
                                ease="power2.out"
                                splitType="chars"
                                from={{ opacity: 0, y: 20 }}
                                to={{ opacity: 1, y: 0 }}
                                threshold={0.2}
                                rootMargin="-50px"
                                textAlign="center"
                            />
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {testimonials.map((review) => (
                                <div key={review.id} className="bg-cream rounded-xl p-6 border border-cream-dark">
                                    <div className="flex gap-1 mb-3">
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} size={16} className="text-accent fill-accent" />
                                        ))}
                                    </div>
                                    <p className="text-charcoal/70 text-sm italic">"{review.comment}"</p>
                                    <p className="mt-4 font-semibold text-charcoal">{review.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
