import MagicBentoCard from "../MagicBentoCard.jsx";

const CategoryGrid = ({ visibleCategories, menuItems, setSelectedCategory, setSearchQuery, setViewAll }) => {
    if (visibleCategories.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-charcoal/50 text-lg">No categories found</p>
            </div>
        );
    }

    return (
        <>
            {/* View All button */}
            <button
                onClick={() => setViewAll(true)}
                className="mb-5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-all"
            >
                View All Items
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleCategories.map((cat) => {
                    const catItemCount = menuItems.filter(i => i.category_id === cat.id).length;
                    return (
                        <MagicBentoCard
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat); setSearchQuery(""); }}
                            glowColor="26, 60, 52"
                            enableTilt={false}
                            enableMagnetism={true}
                            clickEffect={true}
                            enableBorderGlow={true}
                        >
                            <div className="h-36 bg-primary-light/5 flex items-center justify-center overflow-hidden rounded-t-[19px]">
                                {cat.image_url ? (
                                    <img
                                        src={cat.image_url}
                                        alt={cat.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-5xl">🍽️</span>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-charcoal text-lg">{cat.name}</h3>
                                {cat.description && (
                                    <p className="text-charcoal/50 text-sm mt-1 line-clamp-2">{cat.description}</p>
                                )}
                                <p className="text-accent text-sm font-medium mt-2">{catItemCount} items →</p>
                            </div>
                        </MagicBentoCard>
                    );
                })}
            </div>
        </>
    );
};

export default CategoryGrid;
