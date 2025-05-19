import requests
from bs4 import BeautifulSoup
# from pathlib import Path
def get_chess_grandmasters():
    grandmasters = []
    
    for page_num in range(1, 66):
        url = f"https://www.chess.com/members/titled-players/grandmasters?&page={page_num}"
        response = requests.get(url)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            username_tags = soup.find_all('a', class_='members-categories-username')
            
            for tag in username_tags:
                grandmasters.append(tag.text.strip())