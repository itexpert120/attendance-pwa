# Save Daily Homework Reports as snapshots

A Daily Homework Report is stored as one aggregate containing its incharge name, Parent Note, and either ordered Homework Items or a diary photo. Subject identity remains canonical through Subject references, while the class, date, incharge, item order, text, and photo are historical report data. One report is allowed per Class Group and date. This keeps editing and offline backup atomic, trading item-level database queries for a simpler document-shaped record.
