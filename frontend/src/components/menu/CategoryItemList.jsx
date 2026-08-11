import { Plus, Minus, Clock, Star } from "lucide-react";
import AnimatedList from "../AnimatedList.jsx";
import Counter from "../Counter.jsx";

const CategoryItemList = ({
    foodTypeFilter, setFoodTypeFilter, categoryItems, searchQuery,
    openItemDetail, getCartQuantity, addingItemId, handleDecrement, handleIncrement, handleAddToCart,
}) => {
    return (
        <>
            {/* Veg/Non-Veg filter */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFoodTypeFilter("all")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${foodTypeFilter === "all" ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFoodTypeFilter("veg")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === "veg" ? "bg-green-500 text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    <span className="w-3 h-3 border-2 border-current rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>
                    Veg
                </button>
                <button
                    onClick={() => setFoodTypeFilter("nonveg")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === "nonveg" ? "bg-red-500 text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    <span className="w-3 h-3 border-2 border-current rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>
                    Non-Veg
                </button>
            </div>

            {categoryItems.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-charcoal/50 text-lg">
                        {searchQuery ? "No items match your search" : "No items in this category yet"}
                    </p>
                </div>
            ) : (
                <AnimatedList
                    items={categoryItems}
                    showGradients={true}
                    enableArrowNavigation={true}
                    displayScrollbar={false}
                    onItemSelect={(item) => openItemDetail(item)}
                    renderItem={(item, index, isSelected) => (
                        <div className={`bg-white rounded-2xl p-4 flex items-center gap-4 transition-all ${isSelected ? "shadow-md" : "shadow-sm"}`}>
                            {/* Image */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-cream">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-charcoal text-sm sm:text-base">{item.name}</h3>
                                    {item.is_veg ? (
                                        <span className="w-3.5 h-3.5 border-2 border-green-600 rounded-sm flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span>
                                    ) : (
                                        <span className="w-3.5 h-3.5 border-2 border-red-600 rounded-sm flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span></span>
                                    )}
                                </div>
                                {item.description && (
                                    <p className="text-charcoal/50 text-xs sm:text-sm mt-0.5 line-clamp-1">{item.description}</p>
                                )}
                                {parseFloat(item.review_count) > 0 && (
                                    <span className="flex items-center gap-1 text-charcoal/50 text-xs mt-0.5">
                                        <Star size={11} className="text-accent fill-accent" />
                                        {parseFloat(item.avg_rating).toFixed(1)} ({item.review_count})
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {item.discount_price && parseFloat(item.discount_price) < parseFloat(item.price) ? (
                                        <>
                                            <span className="font-bold text-accent text-sm">₹{item.discount_price}</span>
                                            <span className="text-charcoal/40 text-xs line-through">₹{item.price}</span>
                                        </>
                                    ) : (
                                        <span className="font-bold text-accent text-sm">₹{item.price}</span>
                                    )}
                                    {item.preparation_time && (
                                        <span className="text-charcoal/40 text-xs flex items-center gap-0.5">
                                            <Clock size={10} /> {item.preparation_time}min
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick add / quantity control */}
                            {getCartQuantity(item.id) > 0 ? (
                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleDecrement(item.id)}
                                        disabled={addingItemId === item.id}
                                        className="w-8 h-8 rounded-full bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-all disabled:opacity-50"
                                        aria-label="Decrease"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-7 text-center font-semibold text-charcoal text-sm">
                                        <Counter value={getCartQuantity(item.id)} fontSize={14} textColor="#1a1a1a" fontWeight={600} />
                                    </span>
                                    <button
                                        onClick={() => handleIncrement(item.id)}
                                        disabled={addingItemId === item.id}
                                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-dark transition-all disabled:opacity-50"
                                        aria-label="Increase"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddToCart(item.id); }}
                                    disabled={addingItemId === item.id}
                                    className="bg-accent hover:bg-accent-dark text-white w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0"
                                    aria-label={`Add ${item.name}`}
                                >
                                    <Plus size={18} />
                                </button>
                            )}
                        </div>
                    )}
                />
            )}
        </>
    );
};

export default CategoryItemList;
