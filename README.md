⚙️ Installation & Setup
<!-- --------------------------------------------------------------------------------------------------------------------------- -->
1. Backend Setup
# Clone the repository
git clone https://github.com/your-username/pharmly.git
cd project

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install Python requirements
pip install -r requirements.txt

# Run migrations and start server
python manage.py makemigrations
python manage.py migrate
python manage.py create superuser //for aprrove a register shop 
python manage.py runserver

<!-- --------------------------------------------------------------------------------------------------------------------------- -->
2. Frontend Setup
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Start the development server
npm run dev
<!-- --------------------------------------------------------------------------------------------------------------------------- -->
