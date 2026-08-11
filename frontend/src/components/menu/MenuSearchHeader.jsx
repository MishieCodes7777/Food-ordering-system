import { Search, ArrowLeft, Plus } from "lucide-react";

const MenuSearchHeader = ({
    selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery,
    showSuggestions, setShowSuggestions,
    suggestionItems, suggestionCategories,
    categories, menuItems,
}) => {
    return (
        <div className="bg-primary py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    {selectedCategory && (
                        <button
                            onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                            className="text-white hover:text-accent transition-colors"
                            aria-label="Back to categories"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {selectedCategory ? selectedCategory.name : "Our Menu"}
                        </h1>
                        <p className="text-white/60 text-sm mt-1">
                            {selectedCategory
                                ? selectedCategory.description || "Browse items in this category"
                                : "Choose a category to explore"}
                        </p>
                    </div>
                </div>

                {/* Search Bar with Suggestions */}
                <div className="mt-6 relative max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10" />
                    <input
                        type="text"
                        placeholder={selectedCategory ? `Search in ${selectedCategory.name}...` : "Search categories or dishes..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full pl-11 pr-4 py-3 bg-primary-light text-white placeholder:text-white/40 rounded-xl border border-primary-light focus:border-accent outline-none transition-colors"
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && searchQuery.length > 0 && !selectedCategory && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto z-50">
                            {/* Matching items */}
                            {suggestionItems.length > 0 && (
                                <div className="p-2">
                                    <p className="text-xs text-charcoal/40 font-medium px-3 py-1">Dishes</p>
                                    {suggestionItems.slice(0, 5).map((item) => (
                                        <button
                                            key={`item-${item.id}`}
                                            onClick={() => {
                                                const cat = categories.find(c => c.id === item.category_id);
                                                if (cat) setSelectedCategory(cat);
                                                setSearchQuery(item.name);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-cream">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-charcoal truncate">{item.name}</p>
                                                <p className="text-xs text-charcoal/40">{item.category_name} • ₹{item.discount_price || item.price}</p>
                                            </div>
                                            <Plus size={16} className="text-accent flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Matching categories */}
                            {suggestionCategories.length > 0 && (
                                <div className="p-2 border-t border-gray-100">
                                    <p className="text-xs text-charcoal/40 font-medium px-3 py-1">Categories</p>
                                    {suggestionCategories.slice(0, 3).map((cat) => (
                                        <button
                                            key={`cat-${cat.id}`}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setSearchQuery("");
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-cream transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-cream">
                                                {cat.image_url ? (
                                                    <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg">📂</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-charcoal truncate">{cat.name}</p>
                                                <p className="text-xs text-charcoal/40">{menuItems.filter(i => i.category_id === cat.id).length} items</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {suggestionItems.length === 0 && suggestionCategories.length === 0 && (
                                <div className="p-4 text-center text-charcoal/40 text-sm">
                                    No results for "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MenuSearchHeader;
