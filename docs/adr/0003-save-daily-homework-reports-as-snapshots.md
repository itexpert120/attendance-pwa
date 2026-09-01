# Save Daily Homework Reports as snapshots

A Daily Homework Report is stored as one aggregate containing its ordered Homework Items, incharge name, and Parent Note. Subject identity remains canonical through Subject references, while the class, date, incharge, item order, and text are historical report data. One report is allowed per Class Group and date. This keeps editing and offline backup atomic, trading item-level database queries for a simpler document-shaped record.
