import { Minus, Plus, Clock } from "lucide-react";

const ItemDetailModal = ({
    selectedItem, setSelectedItem, itemQuantity, setItemQuantity,
    foodTypeChoice, setFoodTypeChoice, addingItemId, handleAddToCart,
}) => {
    if (!selectedItem) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0" onClick={() => setSelectedItem(null)}>
            <div
                className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto relative animate-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-4 right-4 z-10 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    aria-label="Close"
                >
                    ✕
                </button>

                {/* Image */}
                <div className="h-64 sm:h-72 bg-cream overflow-hidden rounded-t-2xl">
                    {selectedItem.image_url ? (
                        <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl">🍽️</div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Veg/Non-veg badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium mb-2 ${selectedItem.is_veg ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-4 h-4 border-2 ${selectedItem.is_veg ? 'border-green-600' : 'border-red-600'} rounded-sm flex items-center justify-center`}>
                            <span className={`w-2 h-2 ${selectedItem.is_veg ? 'bg-green-600' : 'bg-red-600'} rounded-full`}></span>
                        </span>
                        {selectedItem.is_veg ? 'Veg' : 'Non-Veg'}
                    </span>

                    <h2 className="text-xl font-bold text-charcoal">{selectedItem.name}</h2>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedItem.calories && (
                            <span className="bg-cream text-charcoal/60 text-xs px-2.5 py-1 rounded-full">{selectedItem.calories} cal</span>
                        )}
                        {selectedItem.preparation_time && (
                            <span className="bg-cream text-charcoal/60 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Clock size={10} /> {selectedItem.preparation_time} min
                            </span>
                        )}
                        {selectedItem.category_name && (
                            <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">{selectedItem.category_name}</span>
                        )}
                    </div>

                    {/* Description */}
                    {selectedItem.description && (
                        <p className="text-charcoal/60 text-sm mt-3 leading-relaxed">{selectedItem.description}</p>
                    )}

                    {/* Veg/Non-Veg choice for "both" items */}
                    {selectedItem.food_type === "both" && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-charcoal mb-2">Choose type:</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setFoodTypeChoice("veg")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${foodTypeChoice === "veg" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-charcoal/60"}`}
                                >
                                    <span className="w-4 h-4 border-2 border-green-600 rounded-sm flex items-center justify-center">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                    </span>
                                    Veg
                                </button>
                                <button
                                    onClick={() => setFoodTypeChoice("non-veg")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${foodTypeChoice === "non-veg" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-charcoal/60"}`}
                                >
                                    <span className="w-4 h-4 border-2 border-red-600 rounded-sm flex items-center justify-center">
                                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                                    </span>
                                    Non-Veg
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom bar — quantity + add button */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center gap-4">
                    {/* Quantity selector */}
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                            className="w-10 h-10 flex items-center justify-center text-accent hover:bg-cream transition-colors"
                            aria-label="Decrease"
                        >
                            <Minus size={18} />
                        </button>
                        <span className="w-10 text-center font-semibold text-charcoal">{itemQuantity}</span>
                        <button
                            onClick={() => setItemQuantity(Math.min(20, itemQuantity + 1))}
                            className="w-10 h-10 flex items-center justify-center text-accent hover:bg-cream transition-colors"
                            aria-label="Increase"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Add to cart button */}
                    <button
                        onClick={() => handleAddToCart(selectedItem.id, itemQuantity, foodTypeChoice)}
                        disabled={addingItemId === selectedItem.id}
                        className="flex-1 bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 text-center"
                    >
                        {addingItemId === selectedItem.id ? "Adding..." : (
                            <>
                                Add item
                                {selectedItem.discount_price && parseFloat(selectedItem.discount_price) < parseFloat(selectedItem.price) ? (
                                    <> <span className="line-through opacity-60">₹{(selectedItem.price * itemQuantity).toFixed(0)}</span> ₹{(selectedItem.discount_price * itemQuantity).toFixed(0)}</>
                                ) : (
                                    <> ₹{(selectedItem.price * itemQuantity).toFixed(0)}</>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;
